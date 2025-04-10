import React, { useEffect, useState } from "react";
import Web3 from "web3";
import { Line } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from "chart.js";
import { ClipLoader } from "react-spinners";
import "./App.css";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

// Use a different mainnet RPC to avoid rate limits
const mainnetRpc = "https://eth-mainnet.g.alchemy.com/v2/3rSX4koobav0xvs09T7-Oe6hoQltvC4B";
const sepoliaRpc = "wss://blockchain.googleapis.com/v1/projects/pyusd-hackathon/locations/us-central1/endpoints/ethereum-sepolia/rpc?key=AIzaSyCvZg0I_WEn35bBo4z3oVLzjnxEpxyfngM"; // Use HTTP for Sepolia
const pyusdAddress = "0x6c3ea9036406852006290770BEdFcAbA0e23A0e8";
const transferTopic = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const contractAddress = "0x40036A5550f609C3ef4007e82099a62C28494C18";
const contractABI = [
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "from",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "to",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "name": "logTransfer",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "from",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "to",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "name": "TransferLogged",
      "type": "event"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "dailyVolume",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "day",
          "type": "uint256"
        }
      ],
      "name": "getDailyVolume",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getTransferCount",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "name": "totalReceived",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "name": "totalSent",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "totalVolume",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "transfers",
      "outputs": [
        {
          "internalType": "address",
          "name": "from",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "to",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "timestamp",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    }
  ]

function App() {
  const [stats, setStats] = useState({ count: 0, volume: 0 });
  const [chartData, setChartData] = useState({ labels: [], datasets: [] });
  const [liveTransfers, setLiveTransfers] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [liveTransfersFetched, setLiveTransfersFetched] = useState(false);
  const [account, setAccount] = useState(null);

  const mainnetWeb3 = new Web3(mainnetRpc);
  const sepoliaWeb3 = new Web3(sepoliaRpc);
  const contract = new sepoliaWeb3.eth.Contract(contractABI, contractAddress);

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        setAccount(accounts[0]);
        console.log("Connected:", accounts[0]);
      } catch (err) {
        console.error("Wallet Connection Error:", err);
      }
    } else {
      console.error("MetaMask not detected");
    }
  };

  const subscribeToLiveTransfers = async () => {
    try {
      const subscription = await mainnetWeb3.eth.subscribe("logs", {
        address: pyusdAddress,
        topics: [transferTopic],
      });
  
      subscription.on("data", async (log) => {
        const from = "0x" + log.topics[1].slice(26);
        const to = "0x" + log.topics[2].slice(26);
        const value = Number(mainnetWeb3.utils.hexToNumberString(log.data)) / 1e6;
        console.log("New Live Transfer:", { from, to, value });
  
        setLiveTransfers((prev) => {
          const newTransfers = [{ from, to, value }, ...prev].slice(0, 5);
          return newTransfers;
        });
        setLiveTransfersFetched(true);
  
        if (account) {
          try {
            await contract.methods.logTransfer(from, to, Math.round(value * 1e6)).send({ from: account });
            await fetchStats();
            await fetchChartData();
          } catch (err) {
            console.error("Error logging transfer to contract:", err);
          }
        }
      });
  
      subscription.on("error", (err) => {
        console.error("Subscription Error:", err);
        setLiveTransfers([
          { from: "0x123...abc", to: "0x456...def", value: 100.5 },
          { from: "0x789...ghi", to: "0xabc...jkl", value: 50.25 },
        ]);
        setLiveTransfersFetched(true);
      });
  
      return subscription;
    } catch (err) {
      throw err;
    }
  };

  const fetchLiveTransfers = async (retries = 3, delay = 1000) => {
    for (let i = 0; i < retries; i++) {
      try {
        const blockNumber = await mainnetWeb3.eth.getBlockNumber();
        // Start from the last block fetched, or go back 100 blocks if first fetch
        const fromBlock = lastBlockFetched > 0 ? "0x" + lastBlockFetched.toString(16) : "0x" + (blockNumber - 100).toString(16);
        console.log(`Fetching logs from block ${parseInt(fromBlock, 16)} to ${blockNumber}`);
        const logs = await mainnetWeb3.eth.getPastLogs({
          fromBlock,
          toBlock: "latest",
          address: pyusdAddress,
          topics: [transferTopic],
        });

        console.log(`Found ${logs.length} transfer logs`);
        const transfers = [];
        for (const log of logs) {
          const from = "0x" + log.topics[1].slice(26);
          const to = "0x" + log.topics[2].slice(26);
          const value = Number(mainnetWeb3.utils.hexToNumberString(log.data)) / 1e6;
          transfers.push({ from, to, value });
          console.log("Live Transfer:", { from, to, value });

          if (account) {
            try {
              await contract.methods.logTransfer(from, to, Math.round(value * 1e6)).send({ from: account });
            } catch (err) {
              console.error("Error logging transfer to contract:", err);
            }
          }
        }

        if (transfers.length > 0) {
          setLiveTransfers([...transfers.slice(0, 5)]); // Update with new transfers
        } else {
          console.log("No new transfers found, keeping existing transfers");
        }
        setLiveTransfersFetched(true);
        setLastBlockFetched(blockNumber); // Update the last block fetched
        return;
      } catch (err) {
        console.error(`Live Transfer Error (Attempt ${i + 1}/${retries}):`, err);
        if (i < retries - 1) {
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          setLiveTransfers([
            { from: "0x123...abc", to: "0x456...def", value: 100.5 },
            { from: "0x789...ghi", to: "0xabc...jkl", value: 50.25 },
          ]);
          setLiveTransfersFetched(true);
        }
      }
    }
  };

  const fetchStats = async () => {
    try {
      const count = Number(await contract.methods.getTransferCount().call());
      const volumeRaw = await contract.methods.totalVolume().call();
      const volume = Number(volumeRaw) / 1e6;
      console.log("Stats:", { count, volume });
      setStats({ count, volume });
    } catch (err) {
      console.error("Stats Error:", err);
      setError(err.message);
    }
  };

  const fetchChartData = async () => {
    try {
      const now = Math.floor(Date.now() / 1000 / 86400);
      const days = Array.from({ length: 7 }, (_, i) => now - i).reverse();
      const volumes = await Promise.all(
        days.map((day) => contract.methods.getDailyVolume(day).call().then((v) => Number(v) / 1e6))
      );
      console.log("Chart Data:", { days, volumes });
      setChartData({
        labels: days.map((d) => new Date(d * 86400 * 1000).toLocaleDateString()),
        datasets: [{ label: "Daily Volume (PYUSD)", data: volumes, borderColor: "#3498db", fill: false }],
      });
    } catch (err) {
      console.error("Chart Error:", err);
      setError(err.message);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        await fetchStats();
      } catch (err) {
        console.error("Failed to fetch stats:", err);
      }
      try {
        await fetchChartData();
      } catch (err) {
        console.error("Failed to fetch chart data:", err);
      }
      try {
        await fetchLiveTransfers();
        const interval = setInterval(async () => {
          console.log("Polling for new data...");
          await fetchLiveTransfers();
          await fetchStats();
          await fetchChartData();
        }, 30000);
        return () => clearInterval(interval);
      } catch (err) {
        console.error("Failed to fetch live transfers:", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [account]);

  if (error) return <div>Error: {error}</div>;
  if (loading) return (
    <div className="loading">
      <ClipLoader color="#3498db" size={50} />
      <p>Loading PYUSD Data...</p>
    </div>
  );

  return (
    <div className="app">
      <header>
        <h1>PYUSD Seamless Dashboard</h1>
        {!account && (
          <button onClick={connectWallet} className="connect-btn">
            Connect Wallet
          </button>
        )}
      </header>
      <main>
        <section className="stats">
          <h2>Stats</h2>
          <p>Total Transfers: <span>{stats.count}</span></p>
          <p>Total Volume (PYUSD): <span>{stats.volume.toFixed(2)}</span></p>
          {!liveTransfersFetched && (
            <p className="note">Note: Live PYUSD transfers unavailable; showing demo data.</p>
          )}
        </section>
        <section className="chart">
          <h2>Daily Volume</h2>
          <Line data={chartData} options={{ scales: { y: { beginAtZero: true } } }} />
        </section>
      </main>
      <footer>
        <p>Powered by Google Cloud Blockchain RPC, PYUSD & Solidity</p>
      </footer>
    </div>
  );
}

export default App;