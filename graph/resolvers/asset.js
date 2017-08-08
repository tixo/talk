const {decorateWithTags} = require('./util');
const {
  SEARCH_NON_NULL_OR_ACCEPTED_COMMENTS,
} = require('../../perms/constants');

const Popular = require('../../services/popular');

const Asset = {
  async popular({id}, {action_type, limit, offset}, {loaders: {Comments}}) {
    let popular = await Popular.getByActionType(id, action_type, limit, offset);
    if (popular) {
      return popular.map(({item_id}) => Comments.get.load(item_id));
    }
  },
  recentComments({id}, _, {loaders: {Comments}}) {
    return Comments.genRecentComments.load(id);
  },
  async comment({id}, {id: commentID}, {loaders: {Comments}, user}) {
    const statuses = user && user.can(SEARCH_NON_NULL_OR_ACCEPTED_COMMENTS)
      ? ['NONE', 'ACCEPTED', 'PREMOD', 'REJECTED']
      : ['NONE', 'ACCEPTED'];
    
    let comment = await Comments.get.load(commentID);
    if (!comment || !statuses.includes(comment.status) || comment.asset_id !== id) {
      return null;
    }

    return comment;
  },
  comments({id}, {sort, limit, deep, excludeIgnored, tags}, {loaders: {Comments}}) {
    return Comments.getByQuery({
      asset_id: id,
      sort,
      limit,
      parent_id: deep ? undefined : null,
      tags,
      excludeIgnored,
    });
  },
  commentCount({id, commentCount}, {excludeIgnored, tags}, {user, loaders: {Comments}}) {

    // TODO: remove
    if ((user && excludeIgnored) || tags) {
      return Comments.parentCountByAssetIDPersonalized({assetId: id, excludeIgnored, tags});
    }
    if (commentCount != null) {
      return commentCount;
    }
    return Comments.parentCountByAssetID.load(id);
  },
  totalCommentCount({id, totalCommentCount}, {excludeIgnored, tags}, {user, loaders: {Comments}}) {

    // TODO: remove
    if ((user && excludeIgnored) || tags) {
      return Comments.countByAssetIDPersonalized({assetId: id, excludeIgnored, tags});
    }
    if (totalCommentCount != null) {
      return totalCommentCount;
    }
    return Comments.countByAssetID.load(id);
  },
  async settings({settings = null}, _, {loaders: {Settings}}) {

    // Load the global settings, and merge them into the asset specific settings
    // if we have some.
    let globalSettings = await Settings.load();
    if (settings !== null) {
      settings = Object.assign({}, globalSettings.toObject(), settings);
    } else {
      settings = globalSettings.toObject();
    }

    return settings;
  }
};

// Decorate the Asset type resolver with a tags field.
decorateWithTags(Asset);

module.exports = Asset;
