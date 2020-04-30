defmodule Oli.Delivery.Page.PageContext do

  @moduledoc """
  Defines the context required to render a page in delivery mode.
  """

  @enforce_keys [:page, :activities, :objectives, :previous_page, :next_page]
  defstruct [:page, :activities, :objectives, :previous_page, :next_page]

  alias Oli.Delivery.Page.ActivityContext
  alias Oli.Delivery.Page.PageContext
  alias Oli.Resources.Revision
  alias Oli.Publishing.DeliveryResolver

  @doc """
  Creates the page context required to render a page in delivery model, based
  off of the section context id, the slug of the page to render, and an
  optional id of the parent container that the page exists within. If not
  specified, the container is assumed to be the root resource of the publication.

  The key task performed here is the resolution of all referenced objectives
  and activities that may be present in the content of the page. This
  information is collected and then assembled in a fashion that can be given
  to a renderer.
  """
  @spec create_page_context(String.t, String.t, any) :: %PageContext{}
  def create_page_context(context_id, page_slug, container_id \\ nil) do

    # resolve the page revision per context_id
    page_revision = DeliveryResolver.from_revision_slug(context_id, page_slug)

    # if container_id is nil we assume it is the root
    container = case container_id do
      nil -> DeliveryResolver.root_resource(context_id)
      id -> DeliveryResolver.from_resource_id(context_id, id)
    end

    # determine previous and next pages, if any
    previous_next = get_previous_next(container, page_revision.resource_id)

    # collect all the objectives and activities
    {objective_ids, activity_ids} = get_referenced_resources(page_revision)

    # resolve all of these references, all at once, storing
    # them in a map based on their resource_id as the key
    all_resources = objective_ids ++ activity_ids ++ previous_next
    revisions = DeliveryResolver.from_resource_id(context_id, all_resources)
    |> Enum.reduce(%{}, fn r, m -> Map.put(m, r.resource_id, r) end)

    # create a mapping specifically for the activities
    activities = ActivityContext.create_context_map(activity_ids, revisions)

    # create a mapping specifically for the objectives
    objectives = create_objectives_map(objective_ids, revisions)

    %PageContext{
      page: page_revision,
      activities: activities,
      objectives: objectives,
      previous_page: Map.get(revisions, Enum.at(previous_next, 0)),
      next_page: Map.get(revisions, Enum.at(previous_next, 1))
    }
  end



  defp get_previous_next(%{children: children}, page_resource_id) do

    index = Enum.find_index(children, page_resource_id)

    case {index, length(children) - 1} do
      {_, 0} -> [nil, nil]
      {0, _} -> [nil, Enum.at(children, 1)]
      {a, a} -> [Enum.at(children, a - 1), nil]
      {a, _} -> [Enum.at(children, a - 1), Enum.at(children, a + 1)]
    end
  end

  defp create_objectives_map(objective_ids, revisions) do
    Enum.reduce(objective_ids, %{}, fn id, m ->
      Map.put(m, id, %{
        title: Map.get(revisions, id) |> Map.get(:title)
      })
    end)
  end

  defp get_referenced_resources(
    %Revision{objectives: %{"attached" => objectives}, content: %{"model" => model}}) do

    activities = Enum.filter(model, fn %{"type" => type} -> type == "activity-reference" end)
      |> Enum.map(fn %{"activity_id" => id} -> id end)

    {objectives, activities}
  end

end
