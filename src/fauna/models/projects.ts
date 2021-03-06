import { getQuery, getQueryError } from '@fauna/query';
import { CreateData, FaunaResponseProps, getClient } from '@ootiq/just-faunautils';
import {
  Client,
  CurrentIdentity,
  Get,
  Lambda,
  Map,
  Match,
  Paginate,
  Var,
  Index,
  Let,
  Select,
  If,
  Equals,
  Update,
  Ref,
  Collection,
  Reverse,
  Do,
  Call,
  Function,
  Delete
} from 'faunadb';
import { BaseProjectProps, ProjectByIdProps, ProjectProps } from '~types/projects';
import { QueryManager } from '~types/query';

export class ProjectModel {
  _client: Client;

  constructor(token: string) {
    this._client = getClient(token);
  }

  // for creating new projects
  async CreateNewProject(data: ProjectProps): Promise<QueryManager<ProjectProps>> {
    return this._client
      .query(
        CreateData('projects', {
          owner: CurrentIdentity(),
          formRefs: [],
          ...data
        })
      )
      .then((r: FaunaResponseProps<ProjectProps>) => getQuery(r.data))
      .catch((e) => getQueryError(e));
  }

  // for fetching projects
  async FetchProjects(): Promise<QueryManager<FaunaResponseProps<ProjectProps>[]>> {
    return this._client
      .query(
        Map(
          Paginate(Match(Index('projects_by_userRef'), CurrentIdentity())),
          Lambda(['date', 'ref'], Get(Var('ref')))
        )
      )
      .then((r: FaunaResponseProps<FaunaResponseProps<ProjectProps>[]>) => getQuery(r.data))
      .catch((e) => getQueryError(e));
  }

  // for fetching project by id
  async FetchProjectById(projectId: string): Promise<QueryManager<ProjectByIdProps>> {
    return this._client
      .query(
        Let(
          {
            project: Get(Match(Index('projects_by_id'), projectId))
          },
          If(
            Equals(Select(['data', 'owner'], Var('project')), CurrentIdentity()),
            {
              ref: Select(['ref'], Var('project')),
              id: Select(['data', 'id'], Var('project')),
              name: Select(['data', 'name'], Var('project')),
              createdDate: Select(['data', 'createdDate'], Var('project')),
              forms: Reverse(
                Map(Select(['data', 'formRefs'], Var('project')), Lambda('form', Get(Var('form'))))
              )
            },
            null
          )
        )
      )
      .then((r: ProjectByIdProps | null) => {
        if (!r) {
          return {
            error: true,
            code: 404,
            description: 'Not Found'
          };
        }

        return getQuery(r);
      })
      .catch((e) => getQueryError(e));
  }

  // for updating the project
  // use BaseProjectProps for now, if there are new fields, change this
  async UpdateProject(data: BaseProjectProps, projectRefId: string) {
    return this._client
      .query(
        Update(Ref(Collection('projects'), projectRefId), {
          data: {
            ...data
          }
        })
      )
      .then((r: FaunaResponseProps<ProjectProps>) => getQuery(r.data))
      .catch((e) => getQueryError(e));
  }

  // for removeing the project
  async RemoveProject(projectRefId: string) {
    return this._client
      .query(
        Let(
          {
            projectRef: Ref(Collection('projects'), projectRefId),
            projectDoc: Get(Var('projectRef')),
            owner: Select(['data', 'owner'], Var('projectDoc')),
            formRefs: Select(['data', 'formRefs'], Var('projectDoc'))
          },
          If(
            Equals(CurrentIdentity(), Var('owner')),
            Do(
              // remove each `formRefs`
              Map(
                Var('formRefs'),
                Lambda(
                  'x',
                  Let(
                    {
                      formDoc: Get(Var('x')),
                      formId: Select(['data', 'id'], Var('formDoc'))
                    },
                    Call(Function('removeForm'), [projectRefId, Var('formId')])
                  )
                )
              ),
              // remove the project
              Delete(Var('projectRef')),
              {
                error: false,
                code: 200,
                description: 'Succesfully removed the project'
              }
            ),
            {
              error: true,
              code: 404,
              description: 'Unknown project.'
            }
          )
        )
      )
      .then((r: QueryManager<null>) => {
        console.log(r);
        return r;
      })
      .catch((e) => {
        console.error(e);
        return getQueryError(e);
      });
  }
}
