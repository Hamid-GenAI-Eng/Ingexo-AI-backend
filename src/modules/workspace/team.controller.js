import {
  inviteTeamMember,
  acceptWorkspaceInvite,
  getWorkspaceTeam,
  updateMemberWorkspaceRole,
  removeWorkspaceMember
} from './team.service.js';
import { sendSuccess } from '../../utils/responseHandler.js';
import AppError from '../../utils/AppError.js';

const catchAsync = (fn) => (req, res, next) => {
  fn(req, res, next).catch(next);
};

/**
 * @desc    Get all active members & pending invites in the active workspace
 * @route   GET /api/workspace/team
 * @access  Private (Guarded by auth.protect)
 */
export const getTeam = catchAsync(async (req, res, next) => {
  if (!req.user.workspaceId) {
    return next(new AppError('You do not belong to any active workspace', 400));
  }

  const team = await getWorkspaceTeam(req.user.workspaceId);
  sendSuccess(res, 200, { team });
});

/**
 * @desc    Invite a new team member to the workspace
 * @route   POST /api/workspace/invite
 * @access  Private (Restricted to Owner/Admin)
 */
export const sendInvite = catchAsync(async (req, res, next) => {
  const { email, role } = req.body;

  if (!email) {
    return next(new AppError('Please provide the email address to invite', 400));
  }

  // Restrict inviting to Owner and Admin roles (RBAC Guard)
  if (req.user.role !== 'owner' && req.user.role !== 'admin') {
    return next(new AppError('You do not have permission to invite members to this workspace', 403));
  }

  const invite = await inviteTeamMember({
    workspaceId: req.user.workspaceId,
    email,
    role: role || 'editor',
    invitedById: req.user._id
  });

  // Construct invite link matched to frontend /invite/:token router specs
  const inviteLink = `${req.headers.origin || 'http://localhost:3000'}/invite/${invite.token}`;

  sendSuccess(res, 201, { invite, inviteLink }, 'Teammate successfully invited to workspace');
});

/**
 * @desc    Accept workspace invitation and join the tenant environment
 * @route   POST /api/workspace/invite/accept/:token
 * @access  Private (Must be authenticated to accept)
 */
export const joinWorkspace = catchAsync(async (req, res, next) => {
  const invite = await acceptWorkspaceInvite(req.params.token, req.user._id);
  sendSuccess(res, 200, { workspaceId: invite.workspaceId, role: invite.role }, 'Successfully joined the workspace');
});

/**
 * @desc    Promote or demote a team member's role
 * @route   PATCH /api/workspace/team/:memberId
 * @access  Private (Restricted to Owner/Admin)
 */
export const updateRole = catchAsync(async (req, res, next) => {
  const { role } = req.body;

  if (!role) {
    return next(new AppError('Please provide the target role to assign', 400));
  }

  // Owner/Admin RBAC Check
  if (req.user.role !== 'owner' && req.user.role !== 'admin') {
    return next(new AppError('You do not have permission to modify roles in this workspace', 403));
  }

  const updatedUser = await updateMemberWorkspaceRole(
    req.params.memberId,
    role,
    req.user
  );

  sendSuccess(res, 200, { member: updatedUser }, 'Member role updated successfully');
});

/**
 * @desc    Remove/kick a member from the workspace
 * @route   DELETE /api/workspace/team/:memberId
 * @access  Private (Restricted to Owner/Admin)
 */
export const kickMember = catchAsync(async (req, res, next) => {
  // Owner/Admin RBAC Check
  if (req.user.role !== 'owner' && req.user.role !== 'admin') {
    return next(new AppError('You do not have permission to remove members from this workspace', 403));
  }

  await removeWorkspaceMember(req.params.memberId, req.user);
  sendSuccess(res, 200, { memberId: req.params.memberId }, 'Member successfully removed from workspace');
});
