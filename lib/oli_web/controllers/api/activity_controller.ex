defmodule OliWeb.Api.ActivityController do
  use OliWeb, :controller
  use OpenApiSpex.Controller

  alias Oli.Authoring.Editing.ActivityEditor
  alias Oli.Delivery.Attempts.ActivityLifecycle.Evaluate, as: ActivityEvaluation
  alias Oli.Delivery.Attempts.ActivityLifecycle
  alias Oli.Delivery.Attempts.Core.StudentInput
  alias Oli.Delivery.Sections
  alias Oli.Publishing.DeliveryResolver
  alias OliWeb.ApiSchemas

  @moduledoc tags: ["Storage Service"]

  @moduledoc """
  The storage service allows activity implementations to read, write, update
  and delete documents associated with an activity instance.
  """

  alias OpenApiSpex.Schema

  defmodule DocumentAttributes do
    require OpenApiSpex

    OpenApiSpex.schema(%{
      title: "Activity document attributes",
      description: "The top-level attributes of activity documents",
      type: :object,
      properties: %{
        title: %Schema{type: :string, description: "Title of this document"},
        resource_id: %Schema{
          type: :integer,
          description: "Resource id of the document, not editable"
        },
        objectives: %Schema{type: :object, description: "Per part objective mapping"},
        content: %Schema{type: :object, description: "Delivery specific content"},
        authoring: %Schema{
          type: :object,
          description: "The authoring specific portion of the content"
        }
      },
      required: [],
      example: %{
        "title" => "Adaptive Activity Ensemble C",
        "objectives" => %{},
        "content" => %{"items" => ["1", "2"]}
      }
    })
  end

  defmodule BulkDocuments do
    require OpenApiSpex

    OpenApiSpex.schema(%{
      title: "Bulk document attributes",
      description: "The structure of the body of a request for bulk update",
      type: :object,
      properties: %{
        updates: %Schema{type: :list, description: "An array of DocumentAttribute instances"}
      },
      required: [],
      example: %{
        "updates" => [
          %{
            "title" => "Adaptive Activity Ensemble C",
            "resource_id" => 43223,
            "objectives" => %{},
            "content" => %{"items" => ["1", "2"]}
          }
        ]
      }
    })
  end

  defmodule BulkDocumentResponse do
    require OpenApiSpex

    OpenApiSpex.schema(%{
      title: "Bulk retrieval document response",
      description: "The response for a bulk document fetch operation",
      type: :object,
      properties: %{
        results: %Schema{type: :list, description: "Collection of document attribute instances"}
      },
      required: [:results],
      example: %{
        "result" => "success",
        "results" => []
      }
    })
  end

  defmodule BulkDocumentRequestBody do
    require OpenApiSpex

    OpenApiSpex.schema(%{
      title: "Bulk retrieval document request body",
      description: "The request body for a bulk document fetch operation",
      type: :object,
      properties: %{
        resourceIds: %Schema{
          type: :list,
          description: "Array of resource identifiers of documents being requested"
        }
      },
      required: [:resourceIds],
      example: %{
        "resourceIds" => ["id1", "id2", "id3"]
      }
    })
  end

  @doc """
  Create a new secondary document for an activity.

  Torus activities are comprised of one primary document and zero or more secondary documents. While Torus
  creates the primary document for an activity instance, secondary document creation is entirely the responsibility
  of the activity implementation.

  """
  @doc parameters: [
         project: [
           in: :url,
           schema: %OpenApiSpex.Schema{type: :string},
           required: true,
           description: "The project identifier"
         ],
         resource: [
           in: :url,
           schema: %OpenApiSpex.Schema{type: :string},
           required: true,
           description: "The activity identifier that this document will be secondary to"
         ]
       ],
       request_body:
         {"Attributes for the document", "application/json",
          OliWeb.Api.ActivityController.DocumentAttributes, required: true},
       responses: %{
         201 => {"Creation Response", "application/json", ApiSchemas.CreationResponse}
       }
  def create_secondary(conn, %{
        "project" => project_slug,
        "resource" => activity_id
      }) do
    author = conn.assigns[:current_author]
    update = conn.body_params

    case ActivityEditor.create_secondary(project_slug, activity_id, author, update) do
      {:ok, revision} ->
        conn
        # This sets status code 201 instead of 200
        |> put_status(:created)
        |> json(%{"result" => "success", "resourceId" => revision.resource_id})

      {:error, {:invalid_update_field}} ->
        error(conn, 400, "invalid update field")

      {:error, {:not_found}} ->
        error(conn, 404, "not found")

      {:error, {:not_authorized}} ->
        error(conn, 403, "unauthorized")

      _ ->
        error(conn, 500, "server error")
    end
  end

  @doc false
  def create(conn, %{
        "project" => project_slug,
        "activity_type" => activity_type_slug,
        "model" => model,
        "objectives" => objectives
      }) do
    author = conn.assigns[:current_author]

    scope = Map.get(conn.body_params, "scope", "embedded")

    case ActivityEditor.create(
           project_slug,
           activity_type_slug,
           author,
           model,
           objectives,
           scope
         ) do
      {:ok, {%{slug: slug, resource_id: resource_id}, _}} ->
        json(conn, %{
          "type" => "success",
          "revisionSlug" => slug,
          "resourceId" => resource_id
        })

      {:error, {:not_found}} ->
        error(conn, 404, "not found")

      {:error, {:not_authorized}} ->
        error(conn, 403, "unauthorized")

      _ ->
        error(conn, 500, "server error")
    end
  end

  defp document_to_result(nil) do
    %{
      "result" => "failed"
    }
  end

  defp document_to_result(%{
         objectives: objectives,
         title: title,
         activity_type_id: activity_type_id,
         content: content,
         resource_id: resource_id
       }) do
    %{
      "result" => "success",
      "resourceId" => resource_id,
      "activityType" => activity_type_id,
      "objectives" => objectives,
      "title" => title,
      "content" => Map.delete(content, "authoring"),
      "authoring" => Map.get(content, "authoring")
    }
  end

  @doc """
  Retrieve a document for an activity in an authoring context.

  This retrieves the unpublished revision of an activity document, either a primary or secondary
  document.
  """
  @doc parameters: [
         project: [
           in: :url,
           schema: %OpenApiSpex.Schema{type: :string},
           required: true,
           description: "The project identifier"
         ],
         resource: [
           in: :url,
           schema: %OpenApiSpex.Schema{type: :string},
           required: true,
           description: "The activity document identifier"
         ]
       ],
       responses: %{
         200 =>
           {"Retrieval Response", "application/json",
            OliWeb.Api.ActivityController.DocumentAttributes}
       }
  def retrieve(conn, %{
        "project" => project_slug,
        "resource" => activity_id
      }) do
    author = conn.assigns[:current_author]

    case ActivityEditor.retrieve(project_slug, activity_id, author) do
      {:ok, rev} -> json(conn, document_to_result(rev))
      {:error, {:not_found}} -> error(conn, 404, "not found")
      _ -> error(conn, 500, "server error")
    end
  end

  @doc """
  Bulk retrieve documents for an activity in an authoring context.

  This retrieves the unpublished revision of activity documents.
  """
  @doc parameters: [
         project: [
           in: :url,
           schema: %OpenApiSpex.Schema{type: :string},
           required: true,
           description: "The project identifier"
         ]
       ],
       request_body:
         {"Attributes for the document", "application/json",
          OliWeb.Api.ActivityController.BulkDocumentRequestBody, required: true},
       responses: %{
         200 =>
           {"Retrieval Response", "application/json",
            OliWeb.Api.ActivityController.BulkDocumentResponse}
       }
  def bulk_retrieve(conn, %{
        "project" => project_slug,
        "resourceIds" => activity_ids
      }) do
    author = conn.assigns[:current_author]

    case ActivityEditor.retrieve_bulk(project_slug, activity_ids, author) do
      {:ok, revisions} ->
        json(conn, %{
          "result" => "success",
          "results" => Enum.map(revisions, &document_to_result/1)
        })

      {:error, {:not_found}} ->
        error(conn, 404, "not found")

      _ ->
        error(conn, 500, "server error")
    end
  end

  defp document_to_delivery_result(is_preview_mode, %{
         title: title,
         activity_type_id: activity_type_id,
         content: content,
         resource_id: resource_id
       }) do
    %{
      "result" => "success",
      "title" => title,
      "activityTypeId" => activity_type_id,
      "resourceId" => resource_id,
      "content" =>
        if is_preview_mode do
          content
        else
          Map.delete(content, "authoring")
        end
    }
  end

  defp is_preview_mode?(conn) do
    case Map.get(conn.query_params, "mode", "delivery") do
      "preview" -> true
      _ -> false
    end
  end

  defp has_access?(conn, user, section_slug, is_preview_mode) do
    if is_preview_mode do
      is_admin? = Oli.Accounts.is_admin?(conn.assigns.current_author)
      Sections.is_instructor?(user, section_slug) or is_admin?
    else
      Sections.is_enrolled?(user.id, section_slug)
    end
  end

  @doc """
  Retrieve a document for an activity for delivery purposes.

  This retrieves the published revision of an activity document, either a primary or secondary
  document, for a particular course section.
  """
  @doc parameters: [
         section_slug: [
           in: :url,
           schema: %OpenApiSpex.Schema{type: :string},
           required: true,
           description: "The course section slug"
         ],
         resource: [
           in: :url,
           schema: %OpenApiSpex.Schema{type: :string},
           required: true,
           description: "The activity document identifier"
         ]
       ],
       responses: %{
         200 =>
           {"Retrieval Response", "application/json",
            OliWeb.Api.ActivityController.DocumentAttributes}
       }
  def retrieve_delivery(conn, %{
        "section_slug" => section_slug,
        "resource" => activity_id
      }) do
    user = conn.assigns.current_user

    is_preview_mode = is_preview_mode?(conn)

    if has_access?(conn, user, section_slug, is_preview_mode) do
      case DeliveryResolver.from_resource_id(section_slug, activity_id) do
        nil -> error(conn, 404, "not found")
        rev -> json(conn, document_to_delivery_result(is_preview_mode, rev))
      end
    else
      error(conn, 403, "unauthorized")
    end
  end

  @doc """
  Bulk request a collection of activity documents for delivery purposes.

  This retrieves the published revision of a collection activity document, either a primary or secondary
  documents, for a particular course section.
  """
  @doc parameters: [
         section_slug: [
           in: :url,
           schema: %OpenApiSpex.Schema{type: :string},
           required: true,
           description: "The course section slug"
         ]
       ],
       responses: %{
         200 =>
           {"Retrieval Response", "application/json",
            OliWeb.Api.ActivityController.BulkDocumentResponse}
       }
  def bulk_retrieve_delivery(conn, %{
        "section_slug" => section_slug,
        "resourceIds" => activity_ids
      }) do
    user = conn.assigns.current_user

    is_preview_mode = is_preview_mode?(conn)

    if has_access?(conn, user, section_slug, is_preview_mode) do
      case DeliveryResolver.from_resource_id(section_slug, activity_ids) do
        nil ->
          error(conn, 404, "not found")

        revisions ->
          json(conn, %{
            "result" => "success",
            "results" =>
              Enum.map(revisions, fn rev -> document_to_delivery_result(is_preview_mode, rev) end)
          })
      end
    else
      error(conn, 403, "unauthorized")
    end
  end

  @doc """
  Update a document for an activity.

  This operation will update one or more of the top-level document attributes (`title`, `objectives`, `content`, `authoring`) for
  either primary or secondary activity documents.

  This operation must be performed in the context of an exclusive write lock to avoid concurrent updates. The identifier of the
  lock must be specificed via the `lock` query parameter.
  """
  @doc parameters: [
         project: [
           in: :url,
           schema: %OpenApiSpex.Schema{type: :string},
           required: true,
           description: "The project identifier"
         ],
         resource: [
           in: :url,
           schema: %OpenApiSpex.Schema{type: :string},
           required: true,
           description: "The activity document identifier"
         ],
         lock: [
           in: :query,
           schema: %OpenApiSpex.Schema{type: :string},
           required: true,
           description: "The lock identifier that this operation will be performed within"
         ]
       ],
       request_body:
         {"Attributes for the document", "application/json",
          OliWeb.Api.ActivityController.DocumentAttributes, required: true},
       responses: %{
         200 => {"Update Response", "application/json", ApiSchemas.UpdateResponse}
       }
  def update(conn, %{
        "project" => project_slug,
        "lock" => lock_id,
        "resource" => activity_id
      }) do
    author = conn.assigns[:current_author]

    update = conn.body_params

    case ActivityEditor.edit(project_slug, lock_id, activity_id, author.email, update) do
      {:ok, _} -> json(conn, %{"result" => "success"})
      {:error, {:invalid_update_field}} -> error(conn, 400, "invalid update field")
      {:error, {:not_found}} -> error(conn, 404, "not found")
      {:error, {:not_authorized}} -> error(conn, 403, "unauthorized")
      {:error, {:lock_not_acquired}} -> error(conn, 400, "lock not acquired")
      _ -> error(conn, 500, "server error")
    end
  end

  @doc """
  Bulk activity edit endpoint.

  This operation will update one or more of the top-level document attributes (`title`, `objectives`, `content`, `authoring`) for
  a collection of activity documents.

  This operation must be performed in the context of an exclusive write lock to avoid concurrent updates. The identifier of the
  lock must be specificed via the `lock` query parameter.
  """
  @doc parameters: [
         project: [
           in: :url,
           schema: %OpenApiSpex.Schema{type: :string},
           required: true,
           description: "The project identifier"
         ],
         lock: [
           in: :query,
           schema: %OpenApiSpex.Schema{type: :string},
           required: true,
           description: "The lock identifier that this operation will be performed within"
         ]
       ],
       request_body:
         {"Attributes for the document", "application/json",
          OliWeb.Api.ActivityController.BulkDocuments, required: true},
       responses: %{
         200 => {"Update Response", "application/json", ApiSchemas.UpdateResponse}
       }
  def bulk_update(conn, %{
        "project" => project_slug,
        "lock" => lock_id
      }) do
    author = conn.assigns[:current_author]

    updates = conn.body_params["updates"]

    case ActivityEditor.bulk_edit(project_slug, lock_id, author.email, updates) do
      {:ok, _} -> json(conn, %{"result" => "success"})
      {:error, {:invalid_update_field}} -> error(conn, 400, "invalid update field")
      {:error, {:not_found}} -> error(conn, 404, "not found")
      {:error, {:not_authorized}} -> error(conn, 403, "unauthorized")
      {:error, {:lock_not_acquired}} -> error(conn, 400, "lock not acquired")
      _ -> error(conn, 500, "server error")
    end
  end

  @doc false
  def evaluate(conn, %{"model" => model, "partResponses" => part_inputs}) do
    parsed =
      Enum.map(part_inputs, fn %{"attemptGuid" => part_id, "response" => input} ->
        %{part_id: part_id, input: %StudentInput{input: Map.get(input, "input")}}
      end)

    case ActivityEvaluation.evaluate_from_preview(model, parsed) do
      {:ok, evaluations} -> json(conn, %{"result" => "success", "evaluations" => evaluations})
      {:error, _} -> error(conn, 500, "server error")
    end
  end

  @doc false
  def transform(conn, %{"model" => model}) do
    case ActivityLifecycle.perform_test_transformation(model) do
      {:ok, transformed} -> json(conn, %{"result" => "success", "transformed" => transformed})
      {:no_effect, original} -> json(conn, %{"result" => "success", "transformed" => original})
      {:error, _} -> error(conn, 500, "server error")
    end
  end

  @doc """
  Delete an activity document or a secondary document for an activity.

  This operation will mark an activity or secondary document as deleted, but only for the current unpublished revision.

  This operation must be performed in the context of an exclusive write lock to avoid concurrent updates. The identifier of the
  lock must be specificed via the `lock` query parameter.
  """
  @doc parameters: [
         project: [
           in: :url,
           schema: %OpenApiSpex.Schema{type: :string},
           required: true,
           description: "The project identifier"
         ],
         resource: [
           in: :url,
           schema: %OpenApiSpex.Schema{type: :string},
           required: true,
           description: "The activity identifier to delete"
         ],
         lock: [
           in: :query,
           schema: %OpenApiSpex.Schema{type: :string},
           required: true,
           description: "The lock identifier that this operation will be performed within"
         ]
       ],
       responses: %{
         200 => {"Deletion Response", "application/json", ApiSchemas.UpdateResponse}
       }
  def delete(conn, %{"project" => project_slug, "resource" => resource_id, "lock" => lock_id}) do
    author = conn.assigns[:current_author]

    case ActivityEditor.delete(project_slug, lock_id, resource_id, author) do
      {:ok, _} -> json(conn, %{"result" => "success"})
      {:error, {:lock_not_acquired, _}} -> error(conn, 423, "locked")
      {:error, {:not_applicable}} -> error(conn, 400, "not applicable to this resource")
      {:error, {:not_found}} -> error(conn, 404, "not found")
      {:error, {:not_authorized}} -> error(conn, 403, "unauthorized")
      _ -> error(conn, 500, "server error")
    end
  end

  defp error(conn, code, reason) do
    conn
    |> send_resp(code, reason)
    |> halt()
  end
end
