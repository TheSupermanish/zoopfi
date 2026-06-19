'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@/app/lib/chain';
import { useUser, useChainInvalidate } from '@/app/lib/hooks';
import Link from 'next/link';
import AppShell from '../components/shell/AppShell';
import { PageShell, PageHeader, Card } from '../components/ui/primitives';
import { getGroups, getGroup, createGroup, inviteGroupMember, addGroupMember, addGroupExpense, getGroupInvitations, acceptGroupInvitation, declineGroupInvitation } from '../lib/api';
import { Plus, Users, UserPlus, Coins, Check, ArrowUpRight, Receipt, X, Mail } from 'lucide-react';

interface GroupInvitation {
  _id: string;
  groupId: string;
  groupName: string;
  groupIcon: string;
  groupColor: string;
  invitedUsername: string;
  invitedAddress: string;
  inviterUsername: string;
  inviterAddress: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
  expiresAt: string;
}

interface GroupMember {
  username: string;
  walletAddress: string;
  balance: number;
  joinedAt: string;
}

interface Group {
  _id: string;
  name: string;
  description?: string;
  icon: string;
  color: string;
  creatorAddress: string;
  creatorUsername: string;
  members: GroupMember[];
  totalSpent: number;
  currency: string;
  isSettled: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Expense {
  _id: string;
  description: string;
  amount: number;
  category: string;
  paidByUsername: string;
  paidByAddress: string;
  splitType?: 'equal' | 'custom' | 'percentage' | 'exact';
  splits: { username: string; walletAddress: string; amount: number; paid: boolean }[];
  createdAt: string;
}

const GROUP_ICONS = ['🏠', '✈️', '🍕', '🎮', '🏖️', '🎉', '🛒', '🚗', '🎬', '💼', '🍻', '⛷️'];
const GROUP_COLORS = ['#7f13ec', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899', '#8b5cf6', '#14b8a6'];
const EXPENSE_CATEGORIES = [
  { id: 'food', icon: '🍕', label: 'Food' },
  { id: 'transport', icon: '🚗', label: 'Transport' },
  { id: 'lodging', icon: '🏠', label: 'Lodging' },
  { id: 'entertainment', icon: '🎬', label: 'Entertainment' },
  { id: 'shopping', icon: '🛒', label: 'Shopping' },
  { id: 'utilities', icon: '💡', label: 'Utilities' },
  { id: 'other', icon: '📦', label: 'Other' },
];

export default function GroupsPage() {
  const router = useRouter();
  const { address: walletAddress, authenticated, isConnected } = useWallet();
  const { data: userData } = useUser();
  const username = userData?.username ?? '';
  const invalidate = useChainInvalidate();

  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [listLoading, setListLoading] = useState(true);

  // Mobile view state - controls whether to show list or detail on mobile
  const [showMobileDetail, setShowMobileDetail] = useState(false);

  // Modals
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);

  // Create Group form
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [newGroupIcon, setNewGroupIcon] = useState('👥');
  const [newGroupColor, setNewGroupColor] = useState('#7f13ec');
  const [isCreating, setIsCreating] = useState(false);

  // Add Expense form
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('other');
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [splitType, setSplitType] = useState<'equal' | 'percentage' | 'custom'>('equal');
  const [memberSplits, setMemberSplits] = useState<Record<string, number>>({});

  // Add Member form
  const [newMemberUsername, setNewMemberUsername] = useState('');
  const [isAddingMember, setIsAddingMember] = useState(false);

  const [error, setError] = useState('');

  // Fetch groups
  useEffect(() => {
    if (!walletAddress) return;

    const fetchGroups = async () => {
      setListLoading(true);
      try {
        const result = await getGroups(walletAddress);
        setGroups(result.groups || []);

        // Auto-select first group on desktop only (don't trigger mobile detail view)
        if (result.groups?.length > 0 && !selectedGroup && window.innerWidth >= 1024) {
          selectGroup(result.groups[0]);
        }
      } catch (error) {
        console.error('Error fetching groups:', error);
      } finally {
        setListLoading(false);
      }
    };

    fetchGroups();
  }, [walletAddress]);

  // Redirect if not connected
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!authenticated && !isConnected) {
        router.replace('/');
      }
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // Select a group and load its details
  const selectGroup = async (group: Group) => {
    setSelectedGroup(group);
    setShowMobileDetail(true); // Show detail view on mobile
    try {
      const result = await getGroup(group._id);
      setSelectedGroup(result.group);
      setExpenses(result.expenses || []);
    } catch (error) {
      console.error('Error loading group:', error);
    }
  };

  // Go back to list view on mobile
  const handleBackToList = () => {
    setShowMobileDetail(false);
  };

  // Create new group
  const handleCreateGroup = async () => {
    if (!newGroupName) {
      setError('Please enter a group name');
      return;
    }

    setIsCreating(true);
    setError('');

    try {
      const result = await createGroup({
        name: newGroupName,
        description: newGroupDescription,
        icon: newGroupIcon,
        color: newGroupColor,
        creatorAddress: walletAddress,
      });

      if (result.group) {
        setGroups([result.group, ...groups]);
        setSelectedGroup(result.group);
        setExpenses([]);
        setShowCreateGroup(false);
        setNewGroupName('');
        setNewGroupDescription('');
        setNewGroupIcon('👥');
        setNewGroupColor('#7f13ec');
      }
    } catch (error) {
      setError('Failed to create group');
    } finally {
      setIsCreating(false);
    }
  };

  // Initialize member splits when opening expense modal or changing split type
  const initializeSplits = (type: 'equal' | 'percentage' | 'custom') => {
    if (!selectedGroup) return;

    const memberCount = selectedGroup.members.length;
    const newSplits: Record<string, number> = {};

    if (type === 'equal') {
      // Equal split - just for display, calculated on backend
      selectedGroup.members.forEach(member => {
        newSplits[member.walletAddress] = 100 / memberCount;
      });
    } else if (type === 'percentage') {
      // Default to equal percentages
      selectedGroup.members.forEach(member => {
        newSplits[member.walletAddress] = Math.floor(100 / memberCount);
      });
      // Add remainder to first member
      const remainder = 100 - (Math.floor(100 / memberCount) * memberCount);
      if (remainder > 0 && selectedGroup.members.length > 0) {
        newSplits[selectedGroup.members[0].walletAddress] += remainder;
      }
    } else {
      // Custom amount - start with equal division
      const amount = Number(expenseAmount) || 0;
      selectedGroup.members.forEach(member => {
        newSplits[member.walletAddress] = amount / memberCount;
      });
    }

    setMemberSplits(newSplits);
  };

  // Handle split type change
  const handleSplitTypeChange = (type: 'equal' | 'percentage' | 'custom') => {
    setSplitType(type);
    initializeSplits(type);
  };

  // Update a member's split
  const updateMemberSplit = (walletAddress: string, value: number) => {
    setMemberSplits(prev => ({
      ...prev,
      [walletAddress]: value
    }));
  };

  // Calculate split amounts based on type
  const calculateSplitAmounts = (): Record<string, number> => {
    const amount = Number(expenseAmount) || 0;
    const splits: Record<string, number> = {};

    if (!selectedGroup) return splits;

    if (splitType === 'equal') {
      const splitAmount = amount / selectedGroup.members.length;
      selectedGroup.members.forEach(member => {
        splits[member.walletAddress] = splitAmount;
      });
    } else if (splitType === 'percentage') {
      selectedGroup.members.forEach(member => {
        const percentage = memberSplits[member.walletAddress] || 0;
        splits[member.walletAddress] = (amount * percentage) / 100;
      });
    } else {
      // Custom amounts
      selectedGroup.members.forEach(member => {
        splits[member.walletAddress] = memberSplits[member.walletAddress] || 0;
      });
    }

    return splits;
  };

  // Get total percentage or amount assigned
  const getTotalAssigned = () => {
    if (!selectedGroup) return 0;
    return Object.values(memberSplits).reduce((sum, val) => sum + val, 0);
  };

  // Check if split is valid
  const isSplitValid = () => {
    if (splitType === 'equal') return true;
    if (splitType === 'percentage') {
      const total = getTotalAssigned();
      return Math.abs(total - 100) < 0.01;
    }
    if (splitType === 'custom') {
      const total = getTotalAssigned();
      const amount = Number(expenseAmount) || 0;
      return Math.abs(total - amount) < 0.01;
    }
    return false;
  };

  // Add expense
  const handleAddExpense = async () => {
    if (!expenseDescription || !expenseAmount || !selectedGroup) {
      setError('Please fill in all fields');
      return;
    }

    if (!isSplitValid()) {
      setError(splitType === 'percentage'
        ? 'Percentages must add up to 100%'
        : 'Split amounts must equal the total');
      return;
    }

    setIsAddingExpense(true);
    setError('');

    try {
      // Calculate the actual split amounts to send to backend
      const splitAmounts = calculateSplitAmounts();
      const splits = selectedGroup.members.map(member => ({
        walletAddress: member.walletAddress,
        username: member.username,
        amount: splitAmounts[member.walletAddress] || 0
      }));

      const result = await addGroupExpense(selectedGroup._id, {
        description: expenseDescription,
        amount: Number(expenseAmount),
        category: expenseCategory,
        paidByAddress: walletAddress,
        splits: splits, // Send custom splits
      });

      if (result.expense) {
        setExpenses([result.expense, ...expenses]);
        setSelectedGroup(result.group);

        // Update group in list
        setGroups(groups.map(g => g._id === result.group._id ? result.group : g));

        setShowAddExpense(false);
        setExpenseDescription('');
        setExpenseAmount('');
        setExpenseCategory('other');
        setSplitType('equal');
        setMemberSplits({});
        invalidate();
      }
    } catch (error) {
      setError('Failed to add expense');
    } finally {
      setIsAddingExpense(false);
    }
  };

  // Add member
  const handleAddMember = async () => {
    if (!newMemberUsername || !selectedGroup) {
      setError('Please enter a username');
      return;
    }

    setIsAddingMember(true);
    setError('');

    try {
      const result = await addGroupMember(selectedGroup._id, newMemberUsername, walletAddress);

      if (result.error) {
        setError(result.error);
      } else if (result.group) {
        setSelectedGroup(result.group);
        setGroups(groups.map(g => g._id === result.group._id ? result.group : g));
        setShowAddMember(false);
        setNewMemberUsername('');
        invalidate();
      }
    } catch (error) {
      setError('Failed to add member');
    } finally {
      setIsAddingMember(false);
    }
  };

  // Get balance display
  const getBalanceDisplay = (balance: number) => {
    if (Math.abs(balance) < 0.0001) return { text: 'Settled', color: 'text-purple-200/55' };
    if (balance > 0) return { text: `+${balance.toFixed(4)} USDC`, color: 'text-emerald-300' };
    return { text: `${balance.toFixed(4)} USDC`, color: 'text-rose-300' };
  };

  // Get user's balance in selected group
  const myBalance = selectedGroup?.members.find(m => m.walletAddress === walletAddress)?.balance || 0;

  return (
    <AppShell>
      <div className="flex h-full overflow-hidden">
        {/* Mobile Groups List - shown on mobile when no detail is open */}
        <div className={`lg:hidden absolute inset-0 z-10 overflow-y-auto transition-transform duration-300 ${
          showMobileDetail ? '-translate-x-full' : 'translate-x-0'
        }`}>
          <div className="p-4">
            {/* Mobile Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white">Groups</h1>
                <p className="text-sm text-purple-200/60">Split bills with friends</p>
              </div>
              <button
                onClick={() => setShowCreateGroup(true)}
                className="w-10 h-10 rounded-full bg-gradient-to-r from-[#9b3bff] to-[#6a10c7] text-white flex items-center justify-center shadow-lg shadow-[#7f13ec]/30"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            {/* Groups List */}
            {listLoading ? (
              <div className="flex justify-center py-12">
                <div className="spinner" />
              </div>
            ) : groups.length === 0 ? (
              <Card className="text-center">
                <div className="w-20 h-20 mx-auto rounded-2xl bg-[#9b3bff]/15 text-[#c89bff] flex items-center justify-center mb-4">
                  <Users className="w-10 h-10" />
                </div>
                <h2 className="text-base font-semibold text-white mb-2">No groups yet</h2>
                <p className="text-sm text-purple-200/60 mb-6">
                  Create a group to start splitting expenses
                </p>
                <button
                  onClick={() => setShowCreateGroup(true)}
                  className="btn btn-primary h-12 px-6"
                >
                  Create Your First Group
                </button>
              </Card>
            ) : (
              <div className="space-y-3">
                {groups.map((group) => {
                  const userBalance = group.members.find(m => m.walletAddress === walletAddress)?.balance || 0;
                  const balanceInfo = getBalanceDisplay(userBalance);

                  return (
                    <button
                      key={group._id}
                      onClick={() => selectGroup(group)}
                      className="surface lift w-full flex items-center gap-4 p-4 rounded-2xl text-left"
                    >
                      <div
                        className="flex items-center justify-center w-14 h-14 rounded-xl text-white shrink-0"
                        style={{ backgroundColor: group.color }}
                      >
                        <span className="text-2xl">{group.icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white text-base truncate">
                          {group.name}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm text-purple-200/60">
                            {group.members.length} members
                          </span>
                          <span className="text-purple-200/30">•</span>
                          <span className={`text-sm font-medium ${balanceInfo.color}`}>
                            {balanceInfo.text}
                          </span>
                        </div>
                      </div>
                      <span className="text-purple-200/55">→</span>
                    </button>
                  );
                })}

                {/* Create New Group Button */}
                <button
                  onClick={() => setShowCreateGroup(true)}
                  className="w-full flex items-center justify-center gap-3 p-4 rounded-2xl border-2 border-dashed border-white/10 text-purple-200/60 hover:border-[#9b3bff]/60 hover:text-[#c89bff] transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  <span className="font-medium">Create New Group</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Groups Sidebar - Desktop Only */}
        <aside className="w-72 hidden lg:flex flex-col border-r border-white/5">
          <div className="p-4 flex flex-col h-full">
            <div className="flex items-center justify-between mb-4 px-2">
              <h1 className="text-sm font-semibold uppercase tracking-wider text-purple-200/60">My Groups</h1>
              <button
                onClick={() => setShowCreateGroup(true)}
                className="text-[#c89bff] hover:text-white transition-colors"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-2 flex-1 overflow-y-auto pr-2">
              {listLoading ? (
                <div className="flex justify-center py-8">
                  <div className="spinner" />
                </div>
              ) : groups.length === 0 ? (
                <div className="text-center py-8 text-purple-200/60">
                  <Users className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-sm">No groups yet</p>
                </div>
              ) : (
                groups.map((group) => {
                  const isActive = selectedGroup?._id === group._id;
                  const userBalance = group.members.find(m => m.walletAddress === walletAddress)?.balance || 0;
                  const balanceInfo = getBalanceDisplay(userBalance);

                  return (
                    <button
                      key={group._id}
                      onClick={() => selectGroup(group)}
                      className={`group flex items-center gap-3 px-3 py-3 rounded-xl transition-colors text-left ${
                        isActive
                          ? 'bg-[#9b3bff]/15 border border-[#9b3bff]/30'
                          : 'hover:bg-white/[0.08] border border-transparent'
                      }`}
                    >
                      <div
                        className="flex items-center justify-center w-10 h-10 rounded-xl text-white shrink-0"
                        style={{ backgroundColor: group.color }}
                      >
                        <span className="text-lg">{group.icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold truncate ${isActive ? 'text-white' : 'text-white/80'}`}>
                          {group.name}
                        </p>
                        <p className={`text-xs truncate ${balanceInfo.color}`}>
                          {balanceInfo.text}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-white/10">
              <button
                onClick={() => setShowCreateGroup(true)}
                className="btn btn-primary w-full h-12"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create New Group
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className={`flex-1 overflow-y-auto lg:block ${
          showMobileDetail ? 'block' : 'hidden lg:block'
        }`}>
          {!selectedGroup ? (
            // Empty State - Desktop Only (mobile has its own empty state)
            <div className="h-full hidden lg:flex flex-col items-center justify-center text-center p-8">
              <div className="w-24 h-24 rounded-2xl bg-[#9b3bff]/15 text-[#c89bff] flex items-center justify-center mb-6">
                <Users className="w-12 h-12" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-white mb-2">Welcome to Groups</h2>
              <p className="text-sm text-purple-200/60 mb-6 max-w-md">
                Split bills and expenses with friends. Create a group to get started!
              </p>
              <button
                onClick={() => setShowCreateGroup(true)}
                className="btn btn-primary h-12 px-6"
              >
                Create Your First Group
              </button>
            </div>
          ) : (
            <PageShell variant="wide">
              {/* Mobile Back Button */}
              <button
                onClick={handleBackToList}
                className="lg:hidden flex items-center gap-2 text-purple-200/60 hover:text-white mb-4 transition-colors"
              >
                <span className="text-xl">←</span>
                <span className="font-medium">All Groups</span>
              </button>

              {/* Page Heading */}
              <PageHeader
                title={selectedGroup.name}
                subtitle={`Created ${new Date(selectedGroup.createdAt).toLocaleDateString()} • Total: ${selectedGroup.totalSpent.toFixed(4)} USDC`}
                action={
                  <button
                    onClick={() => setShowAddMember(true)}
                    className="btn btn-secondary h-10 px-4 text-sm"
                  >
                    <UserPlus className="w-4 h-4" />
                    Invite
                  </button>
                }
              />

              {/* Stats Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {/* Balance Card */}
                <Card className="relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 text-white/10">
                    <Coins className="w-16 h-16" />
                  </div>
                  <p className="text-sm font-medium text-purple-200/60 mb-1">Your Balance</p>
                  <div className="flex items-baseline gap-2">
                    <p className={`text-3xl font-bold tabular-nums ${getBalanceDisplay(myBalance).color}`}>
                      {getBalanceDisplay(myBalance).text}
                    </p>
                  </div>
                  <p className="text-xs text-purple-200/55 mt-2">
                    {myBalance > 0 ? "You're owed money" : myBalance < 0 ? "You owe money" : "All settled up!"}
                  </p>
                </Card>

                {/* Members Card */}
                <Card className="relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 text-white/10">
                    <Users className="w-16 h-16" />
                  </div>
                  <p className="text-sm font-medium text-purple-200/60 mb-1">Members</p>
                  <p className="text-3xl font-bold tabular-nums text-white">{selectedGroup.members.length}</p>
                  <div className="flex -space-x-2 mt-3">
                    {selectedGroup.members.slice(0, 4).map((member, i) => (
                      <div
                        key={i}
                        className="w-8 h-8 rounded-full bg-[#9b3bff]/15 text-[#c89bff] border-2 border-white/10 flex items-center justify-center text-xs font-bold"
                      >
                        {member.username[0].toUpperCase()}
                      </div>
                    ))}
                    {selectedGroup.members.length > 4 && (
                      <div className="w-8 h-8 rounded-full bg-white/[0.08] border-2 border-white/10 flex items-center justify-center text-white text-xs font-bold">
                        +{selectedGroup.members.length - 4}
                      </div>
                    )}
                  </div>
                </Card>

                {/* Status Card */}
                <Card className="relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 text-white/10">
                    {selectedGroup.isSettled
                      ? <Check className="w-16 h-16" />
                      : <span className="text-7xl">⏳</span>}
                  </div>
                  <p className="text-sm font-medium text-purple-200/60 mb-1">Status</p>
                  <p className={`text-3xl font-bold mb-4 ${selectedGroup.isSettled ? 'text-emerald-300' : 'text-white'}`}>
                    {selectedGroup.isSettled ? 'Settled' : 'Unsettled'}
                  </p>
                  {!selectedGroup.isSettled && (
                    <button className="w-full py-2 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] font-semibold text-sm text-white transition-colors flex items-center justify-center gap-2">
                      <ArrowUpRight className="w-4 h-4" />
                      Settle Up Now
                    </button>
                  )}
                </Card>
              </div>

              {/* Split Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Members */}
                <div className="lg:col-span-1 flex flex-col gap-6">
                  {/* Members List */}
                  <Card>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-base font-semibold text-white">Members ({selectedGroup.members.length})</h3>
                      <button
                        onClick={() => setShowAddMember(true)}
                        className="text-[#c89bff] text-sm font-semibold hover:text-white transition-colors"
                      >
                        Add
                      </button>
                    </div>
                    <div className="flex flex-col gap-3">
                      {selectedGroup.members.map((member) => {
                        const balanceInfo = getBalanceDisplay(member.balance);
                        const isYou = member.walletAddress === walletAddress;

                        return (
                          <div
                            key={member.walletAddress}
                            className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/[0.06] transition-colors"
                          >
                            <div className="w-10 h-10 rounded-full bg-[#9b3bff]/15 text-[#c89bff] flex items-center justify-center font-bold">
                              {member.username[0].toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-white">
                                {isYou ? 'You' : member.username}
                              </p>
                              <p className="text-xs text-purple-200/55 font-mono">
                                {member.walletAddress.slice(0, 6)}...{member.walletAddress.slice(-4)}
                              </p>
                            </div>
                            <span className={`text-sm font-bold ${balanceInfo.color}`}>
                              {balanceInfo.text}
                            </span>
                          </div>
                        );
                      })}
                      <button
                        onClick={() => setShowAddMember(true)}
                        className="flex items-center justify-center gap-2 p-3 mt-2 rounded-xl border border-dashed border-white/10 text-purple-200/60 hover:bg-white/[0.06] transition-colors text-sm font-medium"
                      >
                        <UserPlus className="w-4 h-4" />
                        Add Member
                      </button>
                    </div>
                  </Card>

                  {/* Spending Mix */}
                  <Card>
                    <h3 className="text-base font-semibold text-white mb-4">Spending Mix</h3>
                    {expenses.length === 0 ? (
                      <p className="text-sm text-purple-200/60 text-center py-4">No expenses yet</p>
                    ) : (
                      <div className="space-y-3">
                        {EXPENSE_CATEGORIES.filter(cat =>
                          expenses.some(e => e.category === cat.id)
                        ).map((cat) => {
                          const categoryTotal = expenses
                            .filter(e => e.category === cat.id)
                            .reduce((sum, e) => sum + e.amount, 0);
                          const percentage = selectedGroup.totalSpent > 0
                            ? (categoryTotal / selectedGroup.totalSpent * 100).toFixed(0)
                            : 0;

                          return (
                            <div key={cat.id} className="flex items-center gap-3">
                              <span className="text-xl">{cat.icon}</span>
                              <div className="flex-1">
                                <div className="flex justify-between text-sm mb-1">
                                  <span className="text-white">{cat.label}</span>
                                  <span className="text-purple-200/60">{percentage}%</span>
                                </div>
                                <div className="w-full bg-white/[0.08] rounded-full h-2">
                                  <div
                                    className="bg-[#9b3bff] h-2 rounded-full"
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </Card>
                </div>

                {/* Right: Activity Feed */}
                <Card className="lg:col-span-2 flex flex-col h-full overflow-hidden !p-0">
                  <div className="p-6 border-b border-white/10 flex items-center justify-between">
                    <h3 className="text-base font-semibold text-white">Recent Activity</h3>
                  </div>

                  <div className="p-6 overflow-y-auto flex-1 max-h-[500px]">
                    {expenses.length === 0 ? (
                      <div className="text-center py-12">
                        <Receipt className="w-10 h-10 mx-auto mb-3 text-purple-200/40" />
                        <p className="text-white font-semibold">No expenses yet</p>
                        <p className="text-sm text-purple-200/60 mt-1">Add your first expense to get started</p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-6 relative">
                        {expenses.map((expense, index) => {
                          const category = EXPENSE_CATEGORIES.find(c => c.id === expense.category);
                          const isSettlement = expense.description.startsWith('Settlement:');

                          return (
                            <div key={expense._id} className="flex gap-4 relative">
                              <div className="flex flex-col items-center">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 z-10 ${
                                  isSettlement
                                    ? 'bg-emerald-500/15 text-emerald-300'
                                    : 'bg-[#9b3bff]/15 text-[#c89bff]'
                                }`}>
                                  {isSettlement
                                    ? <ArrowUpRight className="w-5 h-5" />
                                    : <span className="text-lg">{category?.icon || '📦'}</span>}
                                </div>
                                {index < expenses.length - 1 && (
                                  <div className="w-px h-full bg-white/[0.08] absolute top-10" />
                                )}
                              </div>
                              <div className="flex-1 pb-4">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <p className="text-sm font-semibold text-white">
                                      {expense.paidByUsername === username ? 'You' : expense.paidByUsername} added "{expense.description}"
                                    </p>
                                    <p className="text-xs text-purple-200/60 mt-0.5">
                                      Paid by {expense.paidByUsername === username ? 'You' : expense.paidByUsername} • {
                                        expense.splitType === 'custom' ? 'Custom split' :
                                        expense.splitType === 'percentage' ? 'Split by %' :
                                        'Split equally'
                                      }
                                    </p>
                                  </div>
                                  <span className={`text-sm font-bold ${isSettlement ? 'text-emerald-300' : 'text-white'}`}>
                                    {expense.amount.toFixed(4)} USDC
                                  </span>
                                </div>
                                <div className="mt-2 text-xs text-purple-200/45">
                                  {new Date(expense.createdAt).toLocaleString()}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Add Expense Button */}
                  <div className="p-4 border-t border-white/10">
                    <button
                      onClick={() => setShowAddExpense(true)}
                      className="btn btn-primary w-full h-12"
                    >
                      <Plus className="w-4 h-4" />
                      Add New Expense
                    </button>
                  </div>
                </Card>
              </div>
            </PageShell>
          )}
        </main>
      </div>

      {/* Create Group Modal */}
      {showCreateGroup && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="surface-strong rounded-2xl p-6 w-full max-w-md animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-base font-semibold text-white">Create New Group</h2>
              <button
                onClick={() => setShowCreateGroup(false)}
                className="text-purple-200/60 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Icon & Color Selection */}
              <div className="flex items-center gap-4">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
                  style={{ backgroundColor: newGroupColor }}
                >
                  {newGroupIcon}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-purple-200/60 mb-2">Choose Icon</p>
                  <div className="flex flex-wrap gap-1">
                    {GROUP_ICONS.map((icon) => (
                      <button
                        key={icon}
                        onClick={() => setNewGroupIcon(icon)}
                        className={`w-8 h-8 rounded-xl flex items-center justify-center text-lg transition-colors ${
                          newGroupIcon === icon ? 'bg-[#9b3bff]' : 'bg-white/[0.08] hover:bg-white/10'
                        }`}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Color Selection */}
              <div>
                <p className="text-sm text-purple-200/60 mb-2">Color</p>
                <div className="flex gap-2">
                  {GROUP_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewGroupColor(color)}
                      className={`w-8 h-8 rounded-full transition-transform ${
                        newGroupColor === color ? 'scale-110 ring-2 ring-white' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm text-purple-200/60 mb-2">Group Name *</label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="e.g., Trip to Paris"
                  className="input h-12"
                  maxLength={50}
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm text-purple-200/60 mb-2">Description</label>
                <input
                  type="text"
                  value={newGroupDescription}
                  onChange={(e) => setNewGroupDescription(e.target.value)}
                  placeholder="What's this group for?"
                  className="input h-12"
                  maxLength={200}
                />
              </div>

              {error && <p className="text-rose-300 text-sm">{error}</p>}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowCreateGroup(false)}
                  className="flex-1 btn btn-secondary h-12"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateGroup}
                  disabled={isCreating || !newGroupName}
                  className="flex-1 btn btn-primary h-12"
                >
                  {isCreating ? 'Creating...' : 'Create Group'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Expense Modal */}
      {showAddExpense && selectedGroup && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="surface-strong rounded-2xl w-full max-w-lg animate-scale-in my-4">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <div>
                <h2 className="text-base font-semibold text-white">Add Expense</h2>
                <p className="text-sm text-purple-200/60 mt-1">Split with {selectedGroup.members.length} members</p>
              </div>
              <button
                onClick={() => {
                  setShowAddExpense(false);
                  setSplitType('equal');
                  setMemberSplits({});
                }}
                className="w-8 h-8 rounded-full bg-white/[0.08] flex items-center justify-center text-purple-200/60 hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[calc(100vh-200px)] overflow-y-auto">
              {/* Amount & Description Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Amount */}
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Amount *</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={expenseAmount}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9.]/g, '');
                        setExpenseAmount(val);
                        // Recalculate custom splits when amount changes
                        if (splitType === 'custom' && val) {
                          const amount = Number(val);
                          const memberCount = selectedGroup.members.length;
                          const newSplits: Record<string, number> = {};
                          selectedGroup.members.forEach(member => {
                            newSplits[member.walletAddress] = Number((amount / memberCount).toFixed(4));
                          });
                          setMemberSplits(newSplits);
                        }
                      }}
                      placeholder="0.00"
                      className="input h-14 text-2xl font-bold pr-20"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-purple-200/60 font-medium">
                      USDC
                    </span>
                  </div>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Category</label>
                  <div className="relative">
                    <select
                      value={expenseCategory}
                      onChange={(e) => setExpenseCategory(e.target.value)}
                      className="input h-14 appearance-none cursor-pointer pr-10"
                    >
                      {EXPENSE_CATEGORIES.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.icon} {cat.label}
                        </option>
                      ))}
                    </select>
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-purple-200/60 pointer-events-none">
                      ▼
                    </span>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">Description *</label>
                <input
                  type="text"
                  value={expenseDescription}
                  onChange={(e) => setExpenseDescription(e.target.value)}
                  placeholder="e.g., Dinner at restaurant"
                  className="input h-12"
                  maxLength={200}
                />
              </div>

              {/* Split Type Toggle */}
              <div>
                <label className="block text-sm font-medium text-white mb-3">Split Method</label>
                <div className="p-1 bg-black/30 rounded-xl flex gap-1">
                  <button
                    onClick={() => handleSplitTypeChange('equal')}
                    className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all ${
                      splitType === 'equal'
                        ? 'bg-white/[0.08] text-white shadow-sm'
                        : 'text-purple-200/60 hover:text-white'
                    }`}
                  >
                    ⚖️ Equally
                  </button>
                  <button
                    onClick={() => handleSplitTypeChange('percentage')}
                    className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all ${
                      splitType === 'percentage'
                        ? 'bg-white/[0.08] text-white shadow-sm'
                        : 'text-purple-200/60 hover:text-white'
                    }`}
                  >
                    📊 By %
                  </button>
                  <button
                    onClick={() => handleSplitTypeChange('custom')}
                    className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all ${
                      splitType === 'custom'
                        ? 'bg-white/[0.08] text-white shadow-sm'
                        : 'text-purple-200/60 hover:text-white'
                    }`}
                  >
                    ✏️ Custom
                  </button>
                </div>
              </div>

              {/* Members Split List */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="text-sm font-medium text-white">
                    Split Details ({selectedGroup.members.length} people)
                  </label>
                  {splitType !== 'equal' && (
                    <span className={`text-xs font-bold ${
                      isSplitValid() ? 'text-emerald-300' : 'text-amber-300'
                    }`}>
                      {splitType === 'percentage'
                        ? `${getTotalAssigned().toFixed(0)}% of 100%`
                        : `${getTotalAssigned().toFixed(4)} of ${expenseAmount || '0'} USDC`
                      }
                    </span>
                  )}
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {selectedGroup.members.map((member) => {
                    const isYou = member.walletAddress === walletAddress;
                    const splitAmounts = calculateSplitAmounts();
                    const memberAmount = splitAmounts[member.walletAddress] || 0;
                    const memberPercentage = memberSplits[member.walletAddress] || (100 / selectedGroup.members.length);

                    return (
                      <div
                        key={member.walletAddress}
                        className="flex items-center gap-3 p-3 rounded-xl bg-black/30 border border-white/10"
                      >
                        {/* Avatar */}
                        <div className="w-10 h-10 rounded-full bg-[#9b3bff]/15 text-[#c89bff] flex items-center justify-center font-bold shrink-0">
                          {member.username[0].toUpperCase()}
                        </div>

                        {/* Name */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white truncate">
                            {isYou ? 'You' : member.username}
                          </p>
                          <p className="text-xs text-purple-200/55 font-mono">
                            {member.walletAddress.slice(0, 6)}...{member.walletAddress.slice(-4)}
                          </p>
                        </div>

                        {/* Split Input/Display */}
                        {splitType === 'equal' ? (
                          <div className="text-right">
                            <p className="text-sm font-bold text-white">
                              {memberAmount.toFixed(4)}
                            </p>
                            <p className="text-xs text-purple-200/55">USDC</p>
                          </div>
                        ) : splitType === 'percentage' ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={memberSplits[member.walletAddress] || ''}
                              onChange={(e) => updateMemberSplit(member.walletAddress, Number(e.target.value))}
                              className="w-16 h-9 text-center rounded-xl bg-black/30 border border-white/10 text-sm font-bold text-white focus:border-[#9b3bff]/60"
                              min="0"
                              max="100"
                            />
                            <span className="text-sm text-purple-200/60 font-medium">%</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={memberSplits[member.walletAddress] || ''}
                              onChange={(e) => updateMemberSplit(member.walletAddress, Number(e.target.value))}
                              className="w-24 h-9 text-center rounded-xl bg-black/30 border border-white/10 text-sm font-bold text-white focus:border-[#9b3bff]/60"
                              min="0"
                              step="0.0001"
                            />
                            <span className="text-xs text-purple-200/55">USDC</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Split Summary - Receipt Style */}
              {Number(expenseAmount) > 0 && (
                <div className="surface-inset rounded-2xl overflow-hidden">
                  <div className="p-4 text-white">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-purple-200/60">Split Summary</span>
                      <Receipt className="w-5 h-5 text-purple-200/60" />
                    </div>

                    <div className="border-t border-dashed border-white/10 my-2" />

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-purple-200/60">Total Amount</span>
                        <span className="font-bold font-mono">{Number(expenseAmount).toFixed(4)} USDC</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-purple-200/60">Split Type</span>
                        <span className="font-bold">
                          {splitType === 'equal' ? '⚖️ Equal' : splitType === 'percentage' ? '📊 By %' : '✏️ Custom'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-purple-200/60">Your Share</span>
                        <span className="font-bold font-mono text-[#c89bff]">
                          {calculateSplitAmounts()[walletAddress]?.toFixed(4) || '0.0000'} USDC
                        </span>
                      </div>
                    </div>

                    <div className="border-t border-dashed border-white/10 my-2" />

                    <div className="flex justify-between items-center">
                      <span className="text-xs text-purple-200/50">Paid by you</span>
                      <span className="text-xs text-purple-200/50">
                        {selectedGroup.members.length - 1} others owe you
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Validation Warning */}
              {splitType !== 'equal' && !isSplitValid() && Number(expenseAmount) > 0 && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-2">
                  <span className="text-amber-300">⚠️</span>
                  <p className="text-sm text-amber-300">
                    {splitType === 'percentage'
                      ? `Percentages must add up to 100% (currently ${getTotalAssigned().toFixed(0)}%)`
                      : `Amounts must equal ${expenseAmount} USDC (currently ${getTotalAssigned().toFixed(4)} USDC)`
                    }
                  </p>
                </div>
              )}

              {error && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                  <p className="text-rose-300 text-sm">{error}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-white/10 flex gap-3">
              <button
                onClick={() => {
                  setShowAddExpense(false);
                  setSplitType('equal');
                  setMemberSplits({});
                }}
                className="flex-1 btn btn-secondary h-12"
              >
                Cancel
              </button>
              <button
                onClick={handleAddExpense}
                disabled={isAddingExpense || !expenseDescription || !expenseAmount || (splitType !== 'equal' && !isSplitValid())}
                className="flex-1 btn btn-primary h-12 flex items-center justify-center gap-2"
              >
                {isAddingExpense ? (
                  <>
                    <div className="spinner-sm" />
                    Adding...
                  </>
                ) : (
                  <>
                    <span>Add Expense</span>
                    <span>🚀</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddMember && selectedGroup && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="surface-strong rounded-2xl p-6 w-full max-w-md animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-base font-semibold text-white">Add Member</h2>
              <button
                onClick={() => setShowAddMember(false)}
                className="text-purple-200/60 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-purple-200/60 mb-2">Username *</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#c89bff] font-bold">@</span>
                  <input
                    type="text"
                    value={newMemberUsername}
                    onChange={(e) => setNewMemberUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    placeholder="username"
                    className="input h-12"
                    style={{ paddingLeft: '2.5rem' }}
                  />
                </div>
                <p className="text-xs text-purple-200/60 mt-2">
                  The user must be registered on Zoopfi
                </p>
              </div>

              {error && <p className="text-rose-300 text-sm">{error}</p>}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowAddMember(false);
                    setNewMemberUsername('');
                    setError('');
                  }}
                  className="flex-1 btn btn-secondary h-12 whitespace-nowrap"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddMember}
                  disabled={isAddingMember || !newMemberUsername}
                  className="flex-1 btn btn-primary h-12 flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  {isAddingMember ? (
                    <>
                      <div className="spinner-sm" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4" />
                      <span>Send Invite</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </AppShell>
  );
}
