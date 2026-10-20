"use client";

import { useState } from "react";
import type { NextPage } from "next";
import { formatEther, parseEther } from "viem";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

const erc20Abi = [
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "mint",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

const Home: NextPage = () => {
  const { address } = useAccount();
  const [stakeAmt, setStakeAmt] = useState("");
  const [withdrawAmt, setWithdrawAmt] = useState("");

  const userAddr = address || "0x0000000000000000000000000000000000000000";

  const { data: totalSupply } = useScaffoldReadContract({ contractName: "StakingPool", functionName: "totalSupply" });
  const { data: rewardRate } = useScaffoldReadContract({ contractName: "StakingPool", functionName: "rewardRate" });
  const { data: periodFinish } = useScaffoldReadContract({ contractName: "StakingPool", functionName: "periodFinish" });

  const { data: staked } = useScaffoldReadContract({
    contractName: "StakingPool",
    functionName: "balanceOf",
    args: [userAddr],
  });
  const { data: earned } = useScaffoldReadContract({
    contractName: "StakingPool",
    functionName: "earned",
    args: [userAddr],
    query: { refetchInterval: 4000 },
  });

  const { data: stakingToken } = useScaffoldReadContract({ contractName: "StakingPool", functionName: "stakingToken" });
  const { data: rewardToken } = useScaffoldReadContract({ contractName: "StakingPool", functionName: "rewardToken" });

  const { data: stakeBal } = useReadContract({
    address: stakingToken,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [userAddr],
    query: { enabled: !!stakingToken && !!address },
  });
  const { data: rewardBal } = useReadContract({
    address: rewardToken,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [userAddr],
    query: { enabled: !!rewardToken && !!address },
  });

  const { writeContractAsync: writePool } = useScaffoldWriteContract({ contractName: "StakingPool" });
  const { writeContractAsync: writeRaw } = useWriteContract();

  const fmt = (v?: bigint) =>
    v ? Number(formatEther(v)).toLocaleString(undefined, { maximumFractionDigits: 2 }) : "0";

  const stake = async () => {
    if (!stakeAmt) return;
    try {
      await writePool({ functionName: "stake", args: [parseEther(stakeAmt)] });
      setStakeAmt("");
    } catch (e) {
      console.error(e);
    }
  };
  const withdraw = async () => {
    if (!withdrawAmt) return;
    try {
      await writePool({ functionName: "withdraw", args: [parseEther(withdrawAmt)] });
      setWithdrawAmt("");
    } catch (e) {
      console.error(e);
    }
  };
  const claim = async () => {
    try {
      await writePool({ functionName: "getReward" });
    } catch (e) {
      console.error(e);
    }
  };
  const mintStake = async () => {
    if (!stakingToken || !address) return;
    try {
      await writeRaw({
        address: stakingToken,
        abi: erc20Abi,
        functionName: "mint",
        args: [address, parseEther("1000")],
      });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-extrabold text-red-600 tracking-tight">⚡ Staking Pool</h1>
          <p className="mt-3 text-lg text-slate-600 font-medium">Stake STK · Earn RWD every second</p>
        </div>

        {/* Pool Stats */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Pool Stats</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
              <p className="text-sm font-medium text-slate-500">Total Staked</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {fmt(totalSupply)} <span className="text-sm font-normal text-slate-500">STK</span>
              </p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
              <p className="text-sm font-medium text-slate-500">Reward Rate</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {fmt(rewardRate)} <span className="text-sm font-normal text-slate-500">RWD/s</span>
              </p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
              <p className="text-sm font-medium text-slate-500">Period Ends</p>
              <p className="text-lg font-bold text-slate-900 mt-1">
                {periodFinish ? new Date(Number(periodFinish) * 1000).toLocaleDateString() : "—"}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Your Position */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Your Position</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-600 font-medium">Staked</span>
                <span className="font-mono font-bold text-lg text-slate-900">{fmt(staked)} STK</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-red-600 font-bold">Earned</span>
                <span className="font-mono font-bold text-xl text-red-600">{fmt(earned)} RWD</span>
              </div>
              <div className="border-t border-slate-100 my-3"></div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Wallet STK</span>
                <span className="font-mono text-slate-700">{fmt(stakeBal)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Wallet RWD</span>
                <span className="font-mono text-slate-700">{fmt(rewardBal)}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Actions</h2>

            <div className="space-y-4">
              {/* Stake */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Stake STK</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="0.0"
                    className="flex-1 w-full rounded-lg border border-slate-300 px-4 py-2.5 focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none transition"
                    value={stakeAmt}
                    onChange={e => setStakeAmt(e.target.value)}
                  />
                  <button
                    className="bg-red-600 hover:bg-red-700 text-white font-medium px-6 py-2.5 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    onClick={stake}
                    disabled={!stakeAmt}
                  >
                    Stake
                  </button>
                </div>
              </div>

              {/* Withdraw */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Withdraw STK</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="0.0"
                    className="flex-1 w-full rounded-lg border border-slate-300 px-4 py-2.5 focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none transition"
                    value={withdrawAmt}
                    onChange={e => setWithdrawAmt(e.target.value)}
                  />
                  <button
                    className="bg-slate-800 hover:bg-slate-900 text-white font-medium px-6 py-2.5 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    onClick={withdraw}
                    disabled={!withdrawAmt}
                  >
                    Withdraw
                  </button>
                </div>
              </div>
            </div>

            <div className="relative flex py-5 items-center">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="flex-shrink-0 mx-4 text-slate-400 text-sm">or</span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>

            {/* Claim */}
            <button
              className="w-full bg-white border-2 border-red-600 text-red-600 hover:bg-red-50 font-bold py-3 rounded-lg transition"
              onClick={claim}
            >
              🎁 Claim {fmt(earned)} RWD
            </button>
          </div>
        </div>

        {/* Dev Tools */}
        <div className="mt-8 bg-white rounded-2xl border border-dashed border-slate-300 p-6 text-center">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">🔧 Dev Tools</h2>
          <p className="text-sm text-slate-500 mb-4">Mint 1,000 test STK to your wallet to try the app.</p>
          <button
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-6 py-2 rounded-lg transition text-sm border border-slate-200"
            onClick={mintStake}
          >
            Mint 1,000 STK
          </button>
        </div>
      </div>
    </div>
  );
};

export default Home;
