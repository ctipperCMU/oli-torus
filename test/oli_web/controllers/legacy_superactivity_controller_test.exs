defmodule OliWeb.LegacySuperactivityControllerTest do
  use OliWeb.ConnCase

  alias Oli.Delivery.Sections
  alias Oli.Seeder
  #  alias Oli.Delivery.Attempts.Core.{ResourceAttempt, PartAttempt, ResourceAccess, ActivityAttempt}
  alias Oli.Delivery.Attempts.Core, as: Attempts
  alias Lti_1p3.Tool.ContextRoles
  alias Oli.Activities

  alias OliWeb.Router.Helpers, as: Routes

  describe "legacy superactivity" do
    setup [:setup_session]

    test "deliver legacy superactivity", %{
      user: user,
      conn: conn,
      section: section,
      page_revision: page_revision,
      activity_id: activity_id
    } do
      Sections.enroll(user.id, section.id, [ContextRoles.get_role(:context_learner)])

      instructor = user_fixture(
        %{
          name: "Mr John Bay Doe",
          given_name: "John",
          family_name: "Doe",
          middle_name: "Bay",
        }
      )

      Sections.enroll(instructor.id, section.id, [ContextRoles.get_role(:context_instructor)])

      Activities.list_activity_registrations()

      conn = get(conn, Routes.page_delivery_path(conn, :page, section.slug, page_revision.slug))

      activity_attempt = Attempts.get_activity_attempt_by(resource_id: activity_id)

      conn =
        recycle(conn)
        |> Pow.Plug.assign_current_user(user, OliWeb.Pow.PowHelpers.get_pow_config(:user))

      conn = post(
        conn,
        Routes.legacy_superactivity_path(
          conn,
          :process,
          %{
            "commandName" => "loadClientConfig",
            "activityContextGuid" => activity_attempt.attempt_guid
          }
        )
      )

      IO.write conn.resp_body

      conn =
        recycle(conn)
        |> Pow.Plug.assign_current_user(user, OliWeb.Pow.PowHelpers.get_pow_config(:user))

      conn = post(
        conn,
        Routes.legacy_superactivity_path(
          conn,
          :process,
          %{
            "commandName" => "beginSession",
            "activityContextGuid" => activity_attempt.attempt_guid,
            "others" => "others"
          }
        )
      )

      #      IO.write conn.resp_body

      conn =
        recycle(conn)
        |> Pow.Plug.assign_current_user(user, OliWeb.Pow.PowHelpers.get_pow_config(:user))

      conn = post(
        conn,
        Routes.legacy_superactivity_path(
          conn,
          :process,
          %{
            "commandName" => "loadContentFile",
            "activityContextGuid" => activity_attempt.attempt_guid,
            "others" => "others"
          }
        )
      )

      #      IO.write conn.resp_body

      conn =
        recycle(conn)
        |> Pow.Plug.assign_current_user(user, OliWeb.Pow.PowHelpers.get_pow_config(:user))

      conn = post(
        conn,
        Routes.legacy_superactivity_path(
          conn,
          :process,
          %{
            "commandName" => "startAttempt",
            "activityContextGuid" => activity_attempt.attempt_guid,
            "others" => "others"
          }
        )
      )

      #      IO.write conn.resp_body

      conn =
        recycle(conn)
        |> Pow.Plug.assign_current_user(user, OliWeb.Pow.PowHelpers.get_pow_config(:user))

      conn = post(
        conn,
        Routes.legacy_superactivity_path(
          conn,
          :process,
          %{
            "commandName" => "none",
            "activityContextGuid" => activity_attempt.attempt_guid,
            "others" => "others"
          }
        )
      )

      #      IO.write conn.resp_body
    end

  end

  defp setup_session(%{conn: conn}) do
    user = user_fixture()

    content = %{
      "src" => "index.html",
      "base" => "oli_embedded",
      "stem" => %{
        "id" => "1531714844",
        "content" => [
          %{
            "id" => "2857256760",
            "type" => "p",
            "children" => [
              %{
                "text" => ""
              }
            ]
          }
        ]
      },
      "title" => "Embedded activity",
      "modelXml" => ~s(<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE embed_activity PUBLIC "-//Carnegie Mellon University//DTD Embed 1.1//EN" "http://oli.cmu.edu/dtd/oli-embed-activity_1.0.dtd">
<embed_activity id="custom_side" width="670" height="300">
	<title>Custom Activity</title>
	<source>webcontent/custom_activity/customactivity.js</source>
	<assets>
		<asset name="layout">webcontent/custom_activity/layout.html</asset>
		<asset name="controls">webcontent/custom_activity/controls.html</asset>
		<asset name="styles">webcontent/custom_activity/styles.css</asset>
		<asset name="questions">webcontent/custom_activity/questions.xml</asset>
	</assets>
</embed_activity>
),
      "authoring" => %{
        "parts" => [
          %{
            "id" => "1431162465",
            "hints" => [],
            "responses" => [],
            "scoringStrategy" => "average"
          }
        ],
        "previewText" => ""
      },
      "resourceBase" => "4083472489",
      "resourceURLs" => []
    }

    map =
      Seeder.base_project_with_resource2()
      |> Seeder.add_objective("objective one", :o1)
      |> Seeder.add_activity(
           %{title: "one", max_attempts: 2, content: content},
           :publication,
           :project,
           :author,
           :activity,
           Activities.get_registration_by_slug("oli_embedded").id
         )

    attrs = %{
      graded: false,
      max_attempts: 1,
      title: "page1",
      content: %{
        "model" => [
          %{
            "type" => "activity-reference",
            "purpose" => "None",
            "activity_id" => Map.get(map, :activity).resource.id
          }
        ]
      },
      objectives: %{
        "attached" => [Map.get(map, :o1).resource.id]
      }
    }

    map = Seeder.add_page(map, attrs, :page)

#    Seeder.attach_pages_to(
#      [map.page1, map.page2, map.page.resource],
#      map.container.resource,
#      map.container.revision,
#      map.publication
#    )

    map =
      map
      |> Seeder.create_section()
      |> Seeder.create_section_resources()
    #    section =
    #      section_fixture(%{
    #        context_id: "some-context-id",
    #        project_id: map.project.id,
    #        publication_id: map.publication.id,
    #        institution_id: map.institution.id,
    #        open_and_free: false
    #      })

    lti_params =
      Oli.Lti_1p3.TestHelpers.all_default_claims()
      |> put_in(["https://purl.imsglobal.org/spec/lti/claim/context", "id"], map.section.slug)

    cache_lti_params("params-key", lti_params)

    conn =
      Plug.Test.init_test_session(conn, lti_session: nil)
      |> Pow.Plug.assign_current_user(map.author, OliWeb.Pow.PowHelpers.get_pow_config(:author))
      |> Pow.Plug.assign_current_user(user, OliWeb.Pow.PowHelpers.get_pow_config(:user))

    {
      :ok,
      conn: conn,
      map: map,
      author: map.author,
      institution: map.institution,
      user: user,
      project: map.project,
      publication: map.publication,
      section: map.section,
      revision: map.revision1,
      page_revision: map.page.revision,
      activity_id: Map.get(map, :activity).resource.id
    }
  end

end