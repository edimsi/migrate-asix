import Head from "next/head";
import React, { useState, useEffect, useRef } from "react";
import { Moralis } from "moralis";
import { useMoralis } from "react-moralis";
const V2ABI = require("../abi/V2ABI");
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Web3 from "web3";
import { CopyToClipboard } from "react-copy-to-clipboard";

export default function Home() {
  const { isAuthenticated, authenticate, user, logout } = useMoralis();
  const [wallet, setWallet] = useState("");
  const [login, setLogin] = useState(false);
  const [balance, setBalanace] = useState("0");
  const [balance2, setBalanace2] = useState("0");
  const [amount, setAmount] = useState("0");
  const [maxAmount, setMaxAmount] = useState("0");
  const [approved, setApproved] = useState(false);
  const [form, setForm] = useState("v1");
  Moralis.serverURL = process.env.NEXT_PUBLIC_SERVER_URL;
  const amountValue = useRef(null);

  useEffect(() => {
    async function efek() {
      if (isAuthenticated) {
        if (!login) {
          logout();
        } else {
          const web3 = new Web3(window.ethereum);
          const walletAddress = await user.get("ethAddress");
          setWallet(
            walletAddress.slice(0, 5) +
              "..." +
              walletAddress.slice(
                walletAddress.length - 4,
                walletAddress.length - 0
              )
          );
          // const options = { chain: 'bsc', address: walletAddress, token_addresses: "0xc98a8EC7A07f1b743E86896a52434C4C6A0Dbc42" }
  
          const options = {
            chain: "bsc",
            address: walletAddress,
            token_addresses: process.env.TOKEN_V1,
          };
          const balances = await Moralis.Web3API.account.getTokenBalances(
            options
          );
          console.log(balances);
  
          const options2 = {
            chain: "bsc",
            address: walletAddress,
            token_addresses: process.env.TOKEN_V2,
          };
          const balances2 = await Moralis.Web3API.account.getTokenBalances(
            options2
          );
          console.log(balances2);
  
          let tokcontract = new web3.eth.Contract(V2ABI, process.env.TOKEN_V1);
          const isAprove = await tokcontract.methods
            .allowance(walletAddress, process.env.TOKEN_V2)
            .call();
          console.log(isAprove);
          if (isAprove > 0) {
            setApproved(true);
          }
  
          if (balances2.length > 0) {
            setBalanace2(balances2[0].balance / 10 ** 9);
          }
          if (balances.length > 0) {
            setBalanace(balances[0].balance / 10 ** 9);
          }
        }
      } else {
        setAmount("0");
        setMaxAmount("0");
      }
      async function listenMMAccount() {
        window.ethereum.on("accountsChanged", async function () {
          logout();
          setBalanace("0");
          setBalanace2("0");
          setApproved(false);
          setLogin(false);
        });
      }
      listenMMAccount();
    }
    efek();
  }, [isAuthenticated]);

  async function loginEvt() {
    const web3 = await Moralis.enableWeb3();
    const chainIdHex = await Moralis.switchNetwork("0x38");

    setLogin(true);
    await authenticate({
      signingMessage: "Signing in ASIX Token Swap",
    });
  }

  async function logoutEvt() {
    await logout();
    setWallet("");
    setBalanace("0");
    setBalanace2("0");
    setApproved(false);
    console.log("logged out");
  }

  function formatUang(angka) {
    var number_string = angka.toString().replace(/[^.\d]/g, ""),
      split = number_string.split("."),
      sisa = split[0].length % 3,
      uang = split[0].substr(0, sisa),
      ribuan = split[0].substr(sisa).match(/\d{3}/gi);

    if (ribuan) {
      var separator = sisa ? "," : "";
      uang += separator + ribuan.join(",");
    }

    uang = split[1] != undefined ? uang + "," + split[1] : uang;
    return uang;
  }

  function hanyaAngka(event) {
    let value = event.target.value;
    value = value.replace(/,/g, "");
    value = parseInt(value).toString();

    if (isNaN(value)) {
      value = "0";
    }

    if (form == "v1") {
      if (parseInt(value) > parseInt(balance)) {
        return maxSend();
      }
    } else {
      if (parseInt(value) > parseInt(balance2)) {
        return maxSend();
      }
    }

    let inp = formatUang(value);
    setAmount(inp);
    setMaxAmount(inp);
  }

  function maxSend() {
    if (form == "v1") {
      setAmount(formatUang(parseInt(balance).toString()));
      return setMaxAmount(formatUang(parseInt(balance).toString()));
    } else {
      setAmount(formatUang(parseInt(balance2).toString()));
      return setMaxAmount(formatUang(parseInt(balance2).toString()));
    }
  }

  async function approveV2() {
    const web3 = new Web3(window.ethereum);
    try {
      let user = Moralis.User.current();
      const walletAddress = await user.get("ethAddress");
      await Moralis.enableWeb3();

      let tokcontract = new web3.eth.Contract(V2ABI, process.env.TOKEN_V1);
      const amountApprove = (100000000 * 10 ** 18).toLocaleString("fullwide", {
        useGrouping: false,
      });
      tokcontract.methods.approve(process.env.TOKEN_V2, amountApprove).send(
        {
          from: walletAddress,
          value: 0,
        },
        function (err, ressw) {
          toast.info("Approving ASIX_V2 to spend. Please wait", {
            autoClose: 10000,
            position: toast.POSITION.TOP_CENTER,
          });
          if (err) {
            toast.error("Transaction failed!", {
              position: toast.POSITION.TOP_CENTER,
            });
          } else {
            if (ressw) {
              setTimeout(() => {
                toast.success("Success Enable ASIX_V2", {
                  position: toast.POSITION.TOP_CENTER,
                });
                setApproved(true);
              }, 3000);
            } else {
              setApproved(true);
            }
          }
        }
      );
    } catch (error) {
      console.log(error.message);
    }
  }

  async function SwapToV1() {
    const web3 = new Web3(window.ethereum);
    try {
      let user = Moralis.User.current();
      const walletAddress = user.get("ethAddress");
      await Moralis.enableWeb3();

      let SwapV1 = new web3.eth.Contract(V2ABI, process.env.TOKEN_V2);
      const amountSwap =
        parseInt(amountValue.current.value.replace(/,/g, "")) * 10 ** 9;

      SwapV1.methods.Swap_to_V1(amountSwap).send(
        {
          from: walletAddress,
          value: 0,
        },
        function (err, ressw) {
          toast.info("Swapping your ASIX_V2. Please wait", {
            autoClose: 10000,
            position: toast.POSITION.TOP_CENTER,
          });
          if (err) {
            toast.error("Transaction failed!", {
              position: toast.POSITION.TOP_CENTER,
            });
          } else {
            if (ressw) {
              setTimeout(() => {
                toast.success("Success swapping to ASIX_V1!", {
                  position: toast.POSITION.TOP_CENTER,
                });
                setApproved(true);
                setBalanace2(
                  (balance2 * 10 ** 9 -
                    parseInt(amountValue.current.value.replace(/,/g, "")) *
                      10 ** 9) /
                    10 ** 9
                );
                setBalanace(
                  (balance * 10 ** 9 +
                    parseInt(
                      amountValue.current.value.replace(/,/g, "") * 1000
                    ) *
                      10 ** 9) /
                    10 ** 9
                );
              }, 3000);
            } else {
              setApproved(true);
              setBalanace2(
                (balance2 * 10 ** 9 -
                  parseInt(amountValue.current.value.replace(/,/g, "")) *
                    10 ** 9) /
                  10 ** 9
              );
              setBalanace(
                (balance * 10 ** 9 +
                  parseInt(amountValue.current.value.replace(/,/g, "") * 1000) *
                    10 ** 9) /
                  10 ** 9
              );
            }
          }
        }
      );
    } catch (error) {
      console.log(error.message);
    }
  }

  async function SwapToV2() {
    const web3 = new Web3(window.ethereum);
    try {
      let user = Moralis.User.current();
      const walletAddress = user.get("ethAddress");
      await Moralis.enableWeb3();

      let SwapV2 = new web3.eth.Contract(V2ABI, process.env.TOKEN_V2);
      const amountSwap =
        parseInt(amountValue.current.value.replace(/,/g, "")) * 10 ** 9;

      SwapV2.methods.Swap_to_V2(amountSwap).send(
        {
          from: walletAddress,
          value: 0,
        },
        function (err, ressw) {
          toast.info("Swapping your ASIX_V1. Please wait", {
            autoClose: 10000,
            position: toast.POSITION.TOP_CENTER,
          });
          if (err) {
            toast.error("Transaction failed!", {
              position: toast.POSITION.TOP_CENTER,
            });
          } else {
            if (ressw) {
              setTimeout(() => {
                toast.success("Success swapping to ASIX_V2!", {
                  position: toast.POSITION.TOP_CENTER,
                });
                setApproved(true);
                setBalanace2(
                  (balance2 * 10 ** 9 +
                    parseInt(
                      amountValue.current.value.replace(/,/g, "") / 1000
                    ) *
                      10 ** 9) /
                    10 ** 9
                );
                setBalanace(
                  (balance * 10 ** 9 -
                    parseInt(amountValue.current.value.replace(/,/g, "")) *
                      10 ** 9) /
                    10 ** 9
                );
              }, 3000);
            } else {
              setApproved(true);
              setBalanace2(
                (balance2 * 10 ** 9 +
                  parseInt(amountValue.current.value.replace(/,/g, "") / 1000) *
                    10 ** 9) /
                  10 ** 9
              );
              setBalanace(
                (balance * 10 ** 9 -
                  parseInt(amountValue.current.value.replace(/,/g, "")) *
                    10 ** 9) /
                  10 ** 9
              );
            }
          }
        }
      );
    } catch (error) {
      console.log(error.message);
    }
  }

  return (
    <div className="container">
      <Head>
        <title>ASIX Token Swap</title>
        <meta name="description" content="Generated by create next app" />
        <link rel="icon" href="/asix.png" />
      </Head>

      <div className="container-fluid">
        <div className="row mt-3 bg-none justify-content-md-center">
          <div className="col-lg-8">
            <img alt="" className="img-header" src="/asix.png" />
          </div>
          <div className="col-lg-4">
            <div className="d-flex float-right justify-content-md-center">
              {isAuthenticated ? (
                <>
                  <button className="btn-wallet-address">
                    <img alt="" className="img-option" src="/asix.png" />
                    {wallet}
                  </button>
                  <button
                    onClick={async () => {
                      logoutEvt();
                    }}
                    className="btn-wallet-address"
                  >
                    Disconnect
                  </button>
                </>
              ) : (
                <button
                  onClick={async () => {
                    loginEvt();
                  }}
                  className="btn-wallet-address"
                >
                  Connect Wallet
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="row mt-3 align-items-center justify-content-md-center">
          <div className="col-lg-5">
            <div className="card">
              <h5 className="card-header">MIGRATE YOUR ASIX</h5>
              <div className="card-body">
                <div className="row">
                  <div className="col mb-3">
                    {isAuthenticated ? (
                      <small className="float-right text-success">
                        <i className="bi-circle-fill"></i> Connected
                      </small>
                    ) : (
                      <small className="float-right info">
                        <i className="bi-circle-fill"></i> Not Connected
                      </small>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="send">
                    {form == "v1" ? "ASIX V1" : "ASIX V2"}
                  </label>
                  <p className="info float-right">
                    Balance :
                    {isAuthenticated
                      ? form == "v1"
                        ? " " + formatUang(parseInt(balance).toString())
                        : " " + formatUang(parseInt(balance2).toString())
                      : " 0"}
                  </p>
                  <div className="input-group form">
                    <div className="input-group-prepend">
                      <span className="input-group-text">
                        <img alt=""
                          className="img-asix"
                          src={form == "v1" ? "/asix01.png" : "/asix02.png"}
                        />
                      </span>
                    </div>
                    {isAuthenticated ? (
                      <input
                        type="text"
                        name="send"
                        id="send"
                        value={maxAmount}
                        className="form-control"
                        ref={amountValue}
                        onInput={(event) => {
                          hanyaAngka(event);
                        }}
                      />
                    ) : (
                      <input
                        type="text"
                        disabled
                        value={maxAmount}
                        className="form-control disabled"
                      />
                    )}
                    <div className="input-group-append">
                      <span className="input-group-text">
                        {isAuthenticated ? (
                          <button className="btn-max" onClick={() => maxSend()}>
                            Max
                          </button>
                        ) : (
                          <button disabled className="btn-max disabled">
                            Max
                          </button>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="row align-items-center justify-content-md-center text-center">
                  <div className="col-lg-5 mb-2">
                    <button
                      className="btn-switch"
                      onClick={() => {
                        if (form == "v1") {
                          setAmount("0");
                          setMaxAmount("0");
                          setForm("v2");
                        } else {
                          setAmount("0");
                          setMaxAmount("0");
                          setForm("v1");
                        }
                      }}
                    >
                      <i className="bi bi-arrow-down-short"></i>
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="send">
                    {form == "v1" ? "ASIX V2" : "ASIX V1"}
                  </label>
                  <p className="info float-right">
                    Balance :
                    {isAuthenticated
                      ? form == "v1"
                        ? " " + formatUang(parseInt(balance2).toString())
                        : " " + formatUang(parseInt(balance).toString())
                      : " 0"}
                  </p>

                  <div className="input-group form">
                    <div className="input-group-prepend">
                      <span className="input-group-text">
                        <img alt=""
                          className="img-asix"
                          src={form == "v1" ? "/asix02.png" : "/asix01.png"}
                        />
                      </span>
                    </div>
                    <input
                      type="text"
                      disabled
                      value={
                        form == "v1"
                          ? parseFloat(amount.replace(/,/g, "")) / 1000
                          : parseFloat(amount.replace(/,/g, "")) * 1000
                      }
                      className="form-control"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="row justify-content-md-center mt-3 text-center">
          {isAuthenticated && (
            <>
              {form == "v1" ? (
                <div className="col-lg-4 mb-1 d-flex">
                  {approved ? (
                    <>
                      <button disabled className="btn-wallet disabled mx-auto">
                        Enabled
                      </button>
                      <button
                        className="btn-wallet-address mx-auto"
                        onClick={() => SwapToV2()}
                      >
                        Swap to ASIX V2
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className="btn-wallet-address mx-auto"
                        onClick={() => approveV2()}
                      >
                        Enable ASIX V2
                      </button>

                      <button disabled className="btn-wallet disabled mx-auto">
                        Swap to ASIX V2
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <div className="col-lg-4 text-center">
                  <button
                    className="btn-wallet-address"
                    onClick={() => SwapToV1()}
                  >
                    Swap to ASIX V1
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <div
          className="row justify-content-md-center mt-3 mb-1"
          style={isAuthenticated ? { display: "flex" } : { display: "none" }}
        >
          <div className="col-lg-6 text-center">
            <p style={{ color: "black !important" }}>
              ASIX V1 Contract :
              <a
                href={"https://bscscan.com/token/" + process.env.TOKEN_V1}
                target={"_blank"}
                rel='noreferrer'
                style={{ color: "black !important" }}
              >
                {" " + process.env.TOKEN_V1}
              </a>
              <CopyToClipboard
                text={process.env.TOKEN_V1}
                onCopy={() =>
                  toast.success("Copied!", {
                    position: toast.POSITION.TOP_CENTER,
                    autoClose: 500,
                  })
                }
              >
                <span style={{ fontSize: "20px", cursor: "pointer" }}>
                  <i className="bi bi-files"></i>
                </span>
              </CopyToClipboard>
            </p>

            <p style={{ color: "black !important" }}>
              ASIX V2 Contract :
              <a
                href={"https://bscscan.com/token/" + process.env.TOKEN_V2}
                target={"_blank"}
                rel="noreferrer"
                style={{ color: "black !important" }}
              >
                {" " + process.env.TOKEN_V2}
              </a>
              <CopyToClipboard
                text={process.env.TOKEN_V2}
                onCopy={() =>
                  toast.success("Copied!", {
                    position: toast.POSITION.TOP_CENTER,
                    autoClose: 500,
                  })
                }
              >
                <span style={{ fontSize: "20px", cursor: "pointer" }}>
                  <i className="bi bi-files"></i>
                </span>
              </CopyToClipboard>
            </p>
          </div>
        </div>
        <ToastContainer />
      </div>
    </div>
  );
}
