const ROLE_RANK = Object.freeze({
  client: 0,
  staff: 1,
  admin: 2, // new Admin (previously Manager)
  super_admin: 3, // new top-level (previously Admin)
});

const rank = (role) => ROLE_RANK[role] ?? -1;
const canView = (viewerRole, targetRole) => rank(viewerRole) >= rank(targetRole);
const canEdit = (actorRole, targetRole) => rank(actorRole) > rank(targetRole);

module.exports = {
  ROLE_RANK,
  rank,
  canView,
  canEdit,
};