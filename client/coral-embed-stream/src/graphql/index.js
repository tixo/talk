import {gql} from 'react-apollo';
import update from 'immutability-helper';
import uuid from 'uuid/v4';
import {insertCommentIntoEmbedQuery, removeCommentFromEmbedQuery} from './utils';

export default {
  fragments: {
    EditCommentResponse: gql`
      fragment CoralEmbedStream_EditCommentResponse on EditCommentResponse {
        comment {
          id
          status
          body
          editing {
            edited
          }
        }
      }
    `,
    RemoveTagResponse: gql`
      fragment CoralEmbedStream_RemoveTagResponse on RemoveTagResponse {
        comment {
          id
          tags {
            name
          }
        }
      }
    `,
    AddTagResponse: gql`
      fragment CoralEmbedStream_AddTagResponse on AddTagResponse {
        comment {
          id
          tags {
            name
          }
        }
      }
    `,
    CreateFlagResponse: gql`
      fragment CoralEmbedStream_CreateFlagResponse on CreateFlagResponse {
        flag {
          id
        }
      }
    `,
    CreateDontAgreeResponse : gql`
      fragment CoralEmbedStream_CreateDontAgreeResponse on CreateDontAgreeResponse {
        dontagree {
          id
        }
      }
    `,
    CreateCommentResponse: gql`
      fragment CoralEmbedStream_CreateCommentResponse on CreateCommentResponse {
        comment {
          ...CoralEmbedStream_CreateCommentResponse_Comment
          replies {
            nodes {
              ...CoralEmbedStream_CreateCommentResponse_Comment
            }
            startCursor
            endCursor
            hasNextPage
          }
        }
      }

      fragment CoralEmbedStream_CreateCommentResponse_Comment on Comment {
        id
        body
        created_at
        status
        replyCount
        asset {
          id
          title
          url
        }
        tags {
          tag {
            name
            created_at
          }
          assigned_by {
            id
          }
        }
        user {
          id
          username
        }
        action_summaries {
          count
          current_user {
            id
            created_at
          }
        }
        editing {
          edited
          editableUntil
        }
        parent {
          id
        }
      }
    `,
  },
  mutations: {
    PostComment: ({
      variables: {input: {asset_id, body, parent_id, tags = []}},
      state: {auth},
    }) => ({
      optimisticResponse: {
        createComment: {
          __typename: 'CreateCommentResponse',
          comment: {
            __typename: 'Comment',
            user: {
              __typename: 'User',
              id: auth.user.id,
              username: auth.user.username
            },
            created_at: new Date().toISOString(),
            body,
            action_summaries: [],
            tags: tags.map((tag) => ({
              tag: {
                name: tag,
                created_at: new Date().toISOString(),
                __typename: 'Tag'
              },
              assigned_by: {
                id: auth.user.id,
                __typename: 'User'
              },
              __typename: 'TagLink'
            })),
            status: 'NONE',
            replyCount: 0,
            asset: {
              __typename: 'Asset',
              id: asset_id,
              title: '',
              url: '',
            },
            parent: parent_id
              ? {__typename: 'Comment', id: parent_id}
              : null,
            replies: {
              __typename: 'CommentConnection',
              nodes: [],
              hasNextPage: false,
              startCursor: new Date().toISOString(),
              endCursor: new Date().toISOString(),
            },
            editing: {
              __typename: 'EditInfo',
              editableUntil: new Date().toISOString(),
              edited: false,
            },
            id: `pending-${uuid()}`,
          }
        }
      },
      updateQueries: {
        CoralEmbedStream_Embed: (prev, {mutationResult: {data: {createComment: {comment}}}}) => {
          if (prev.asset.settings.moderation === 'PRE' || comment.status === 'PREMOD' || comment.status === 'REJECTED') {
            return prev;
          }
          return insertCommentIntoEmbedQuery(prev, comment);
        },
        CoralEmbedStream_Profile: (prev, {mutationResult: {data: {createComment: {comment}}}}) => {
          return update(prev, {
            me: {
              comments: {
                nodes: {$unshift: [comment]},
              },
            },
          });
        },
      }
    }),
    EditComment: () => ({
      updateQueries: {
        CoralEmbedStream_Embed: (prev, {mutationResult: {data: {editComment: {comment}}}}) => {
          if (!['PREMOD', 'REJECTED'].includes(comment.status)) {
            return null;
          }
          return removeCommentFromEmbedQuery(prev, comment.id);
        },
      },
    }),
  },
};

