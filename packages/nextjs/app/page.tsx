"use client";

import { useState } from "react";
import type { NextPage } from "next";
import { formatEther, parseEther } from "viem";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

// Minimal ABI so TypeScript stops complaining about the two MockERC20s
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

  // Safe fallback address to prevent TS errors
  const userAddr = address || "0x0000000000000000000000000000000000000000";

  // Pool stats
  const { data: totalSupply } = useScaffoldReadContract({ contractName: "StakingPool", functionName: "totalSupply" });
  const { data: rewardRate } = useScaffoldReadContract({ contractName: "StakingPool", functionName: "rewardRate" });
  const { data: periodFinish } = useScaffoldReadContract({ contractName: "StakingPool", functionName: "periodFinish" });

  // User stats
  const { data: staked } = useScaffoldReadContract({
    contractName: "StakingPool",
    functionName: "balanceOf",
    args: [userAddr],
  });
  const { data: earned } = useScaffoldReadContract({
    contractName: "StakingPool",
    functionName: "earned",
    args: [userAddr],
    query: { refetchInterval: 4000 }, // Automatically refresh every 4 seconds!
  });

  // Get token contract addresses from the pool
  const { data: stakingToken } = useScaffoldReadContract({ contractName: "StakingPool", functionName: "stakingToken" });
  const { data: rewardToken } = useScaffoldReadContract({ contractName: "StakingPool", functionName: "rewardToken" });

  // Read wallet balances using standard Wagmi
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
    <div className="min-h-screen bg-base-200 py-10 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold">⚡ Staking Pool</h1>
          <p className="text-lg text-base-content/70 mt-2">Stake STK · Earn RWD every second</p>
        </div>

        <div className="card bg-base-100 shadow-xl mb-6">
          <div className="card-body">
            <h2 className="card-title text-2xl mb-2">Pool Stats</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="stat bg-base-200 rounded-box">
                <div className="stat-title">Total Staked</div>
                <div className="stat-value text-2xl">{fmt(totalSupply)}</div>
                <div className="stat-desc">STK</div>
              </div>
              <div className="stat bg-base-200 rounded-box">
                <div className="stat-title">Reward Rate</div>
                <div className="stat-value text-2xl">{fmt(rewardRate)}</div>
                <div className="stat-desc">RWD / second</div>
              </div>
              <div className="stat bg-base-200 rounded-box">
                <div className="stat-title">Period Ends</div>
                <div className="stat-value text-2xl">
                  {periodFinish ? new Date(Number(periodFinish) * 1000).toLocaleDateString() : "—"}
                </div>
                <div className="stat-desc">
                  {periodFinish ? new Date(Number(periodFinish) * 1000).toLocaleTimeString() : ""}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Your Position</h2>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-base-content/70">Staked</span>
                  <span className="font-mono font-bold">{fmt(staked)} STK</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-base-content/70">Earned</span>
                  <span className="font-mono font-bold text-success">{fmt(earned)} RWD</span>
                </div>
                <div className="divider my-2" />
                <div className="flex justify-between text-sm">
                  <span className="text-base-content/50">Wallet STK</span>
                  <span className="font-mono">{fmt(stakeBal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-base-content/50">Wallet RWD</span>
                  <span className="font-mono">{fmt(rewardBal)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Actions</h2>
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Stake STK</span>
                </label>
                <div className="join w-full">
                  <input
                    type="number"
                    placeholder="0.0"
                    className="input input-bordered join-item w-full"
                    value={stakeAmt}
                    onChange={e => setStakeAmt(e.target.value)}
                  />
                  <button className="btn btn-primary join-item" onClick={stake} disabled={!stakeAmt}>
                    Stake
                  </button>
                </div>
              </div>
              <div className="form-control mt-2">
                <label className="label">
                  <span className="label-text">Withdraw STK</span>
                </label>
                <div className="join w-full">
                  <input
                    type="number"
                    placeholder="0.0"
                    className="input input-bordered join-item w-full"
                    value={withdrawAmt}
                    onChange={e => setWithdrawAmt(e.target.value)}
                  />
                  <button className="btn btn-secondary join-item" onClick={withdraw} disabled={!withdrawAmt}>
                    Withdraw
                  </button>
                </div>
              </div>
              <div className="divider">or</div>
              <button className="btn btn-success w-full" onClick={claim}>
                🎁 Claim {fmt(earned)} RWD
              </button>
            </div>
          </div>
        </div>

        <div className="card bg-base-100 shadow-xl mt-6">
          <div className="card-body">
            <h2 className="card-title text-sm">🔧 Dev Tools</h2>
            <p className="text-xs text-base-content/60">Mint 1,000 test STK to your wallet.</p>
            <button className="btn btn-warning btn-sm mt-2" onClick={mintStake}>
              Mint 1,000 STK
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
