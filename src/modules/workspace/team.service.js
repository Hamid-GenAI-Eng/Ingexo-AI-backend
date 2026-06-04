import crypto from 'crypto';
import Workspace from './workspace.model.js';
import WorkspaceInvite from './invite.model.js';
import User from '../../models/User.js';
import Document from '../documents/doc.model.js';
import AppError from '../../utils/AppError.js';

/**
 * Automatically create a default workspace for a newly signed-up user
 */
export const initializeUserWorkspace = async (userId, ownerName) => {
  const workspace = await Workspace.create({
    name: `${ownerName}'s Workspace`,
    ownerId: userId
  });

  // Link the user back to the workspace
  await User.findByIdAndUpdate(userId, {
    workspaceId: workspace._id,
    role: 'owner'
  });

  return workspace;
};

/**
 * Dispatch an invitation to join the workspace
 */
export const inviteTeamMember = async ({
  workspaceId,
  email,
  role,
  invitedById
}) => {
  // 1. Verify that the invitee is not already an active member in the workspace
  const activeMember = await User.findOne({ email, workspaceId });
  if (activeMember) {
    throw new AppError('This user is already an active member in this workspace', 400);
  }

  // 2. Check if a pending invite already exists (delete the old one to overwrite)
  await WorkspaceInvite.findOneAndDelete({ email, workspaceId, status: 'pending' });

  // 3. Generate secure token
  const token = crypto.randomUUID();

  // 4. Create invite policy
  const invite = await WorkspaceInvite.create({
    workspaceId,
    email,
    role,
    token,
    invitedBy: invitedById
  });

  return invite;
};

/**
 * Accept invite and associate the new member's workspace
 */
export const acceptWorkspaceInvite = async (token, userId) => {
  // 1. Find invite and verify validity
  const invite = await WorkspaceInvite.findOne({ token, status: 'pending' });
  if (!invite) {
    throw new AppError('The invitation link is invalid or has already been accepted', 404);
  }

  if (invite.expiresAt && new Date() > invite.expiresAt) {
    invite.status = 'expired';
    await invite.save();
    throw new AppError('The invitation link has expired', 410);
  }

  // 2. Associate the user to the new workspace and assign role
  await User.findByIdAndUpdate(userId, {
    workspaceId: invite.workspaceId,
    role: invite.role
  });

  // 3. Mark invite as accepted
  invite.status = 'accepted';
  await invite.save();

  return invite;
};

/**
 * Query workspace active members and pending invitations
 * Compiles document uploads metrics, matching exactly the frontend /app/team schema requirements!
 */
export const getWorkspaceTeam = async (workspaceId) => {
  // 1. Fetch active members
  const members = await User.find({ workspaceId });
  
  // 2. Fetch pending invites
  const invites = await WorkspaceInvite.find({ workspaceId, status: 'pending' });

  // Compile active members list with document counts
  const memberList = await Promise.all(
    members.map(async (m) => {
      const docCount = await Document.countDocuments({ ownerId: m._id });
      const initials = m.fullName
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase() || 'U';

      // Random gradient colors for profile styling
      const gradients = [
        'from-rose-500 to-orange-500',
        'from-violet-500 to-fuchsia-500',
        'from-cyan-500 to-blue-500',
        'from-emerald-500 to-teal-500',
        'from-amber-500 to-pink-500'
      ];
      const color = gradients[Math.floor(Math.random() * gradients.length)];

      return {
        id: m._id,
        name: m.fullName,
        email: m.email,
        role: m.role.charAt(0).toUpperCase() + m.role.slice(1), // Capitalize first letter e.g. Owner, Admin, Editor, Viewer
        status: 'active',
        lastActive: 'Active recently',
        documents: docCount,
        initials,
        color
      };
    })
  );

  // Compile pending invites list
  const inviteList = invites.map((inv) => {
    return {
      id: inv._id,
      name: '—',
      email: inv.email,
      role: inv.role.charAt(0).toUpperCase() + inv.role.slice(1),
      status: 'pending',
      lastActive: `Invited on ${new Date(inv.createdAt).toLocaleDateString()}`,
      documents: 0,
      initials: inv.email.substring(0, 2).toUpperCase(),
      color: 'from-slate-500 to-zinc-500'
    };
  });

  return [...memberList, ...inviteList];
};

/**
 * Modify a team member's role (enforcing Owner protections)
 */
export const updateMemberWorkspaceRole = async (memberId, targetRole, activeUser) => {
  const targetUser = await User.findById(memberId);
  if (!targetUser || !targetUser.workspaceId.equals(activeUser.workspaceId)) {
    throw new AppError('User not found in this workspace', 404);
  }

  // Prevent editing Owner role
  if (targetUser.role === 'owner') {
    throw new AppError('Cannot modify the role of the workspace Owner', 400);
  }

  // Enforce lowercase inside DB
  targetUser.role = targetRole.toLowerCase();
  await targetUser.save();

  return targetUser;
};

/**
 * Remove a member from the workspace (unlinking workspace ID)
 */
export const removeWorkspaceMember = async (memberId, activeUser) => {
  const targetUser = await User.findById(memberId);
  if (!targetUser || !targetUser.workspaceId.equals(activeUser.workspaceId)) {
    throw new AppError('User not found in this workspace', 404);
  }

  if (targetUser.role === 'owner') {
    throw new AppError('Cannot remove the workspace Owner', 400);
  }

  // Remove workspaceId and revert to basic local owner of their own empty workspace
  const workspace = await Workspace.create({
    name: `${targetUser.fullName}'s Workspace`,
    ownerId: targetUser._id
  });

  targetUser.workspaceId = workspace._id;
  targetUser.role = 'owner';
  await targetUser.save();

  return targetUser;
};
