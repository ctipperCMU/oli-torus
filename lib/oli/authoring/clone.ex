defmodule Oli.Authoring.Clone do
  import Ecto.Query, warn: false
  import Oli.Authoring.Editing.Utils
  alias Oli.Publishing
  alias Oli.Publishing.{AuthoringResolver}
  alias Oli.Authoring.{Collaborators, Locks}
  alias Oli.Repo
  alias Oli.Authoring.Course

  def clone_project(project_slug, author) do
    Repo.transaction(fn ->
      with {:ok, base_project} <-
             Course.get_project_by_slug(project_slug) |> Repo.preload(:family) |> trap_nil(),
           {:ok, cloned_family} <-
             Course.create_family(%{
               title: base_project.family.title <> " Copy",
               description: base_project.family.description
             }),
           {:ok, cloned_project} <-
             Course.create_project(%{
               title: base_project.title <> " Copy",
               version: "1.0.0",
               family_id: cloned_family.id,
               project_id: base_project.id
             }),
           {:ok, _} <- Collaborators.add_collaborator(author, cloned_project),
           base_root_container <- AuthoringResolver.root_container(base_project.slug),
           {:ok, cloned_publication} <-
             Publishing.create_publication(%{
               project_id: cloned_project.id,
               root_resource_id: base_root_container.resource_id
             }),
           base_publication <- Publishing.project_working_publication(base_project.slug),
           _ <- Locks.release_all(base_publication.id),
           _ <- clone_all_published_resources(base_publication.id, cloned_publication.id),
           _ <- clone_all_project_resources(base_project.id, cloned_project.id),
           _ <- clone_all_media_items(base_project.id, cloned_project.id) do
        cloned_project
      else
        {:error, error} -> Repo.rollback(error)
      end
    end)
  end

  def clone_all_project_resources(base_project_id, cloned_project_id) do
    query = """
      INSERT INTO projects_resources(project_id, resource_id, inserted_at, updated_at)
      SELECT $1, resource_id, now(), now()
      FROM projects_resources as p
      WHERE p.project_id = $2;
    """

    Repo.query!(query, [cloned_project_id, base_project_id])
  end

  def clone_all_published_resources(base_publication_id, cloned_publication_id) do
    query = """
      INSERT INTO published_resources(publication_id, revision_id, resource_id, inserted_at, updated_at)
      SELECT $1, revision_id, resource_id, now(), now()
      FROM published_resources as p
      WHERE p.publication_id = $2;
    """

    Repo.query!(query, [cloned_publication_id, base_publication_id])
  end

  def clone_all_media_items(base_project_id, cloned_project_id) do
    query = """
      INSERT INTO media_items(project_id, url, file_name, mime_type, file_size, md5_hash, deleted, inserted_at, updated_at)
      SELECT $1, url, file_name, mime_type, file_size, md5_hash, deleted, now(), now()
      FROM media_items as p
      WHERE p.project_id = $2;
    """

    Repo.query!(query, [cloned_project_id, base_project_id])
  end
end
