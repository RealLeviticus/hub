"use client"

import { useEffect, useState } from "react"
import cmp from "semver-compare"
import useUser from "@/lib/useUser"

import Modal from "@/components/ui/Modal"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

import BarLoader from "react-spinners/BarLoader"
import PuffLoader from "react-spinners/PuffLoader"
import { RefreshCw, Check, X, Circle, Trash2, Download, Link } from "lucide-react"

export default function Home() {
  // Authentication state from the first component
  const { user, isLoading: isUserLoading, error: userError } = useUser({ redirectTo: "/login" })

  // State from the second component
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [downloadingUpdate, setDownloadingUpdate] = useState(false)
  const [updateProgress, setUpdateProgress] = useState(0)
  const [updateComplete, setUpdateComplete] = useState(false)

  const [serverFailedMessage, setServerFailedMessage] = useState("")
  const [warningShown, setWarningShown] = useState(false)

  const [availableClients, setAvailableClients] = useState([])
  const [selectedClient, setSelectedClient] = useState({})
  const [clientFailMessage, setClientFailMessage] = useState("")
  const [clientStatus, setClientStatus] = useState("waiting")
  const [downloadStatus, setDownloadStatus] = useState(0)
  const [installed, setInstalled] = useState(false)
  const [installedVersion, setInstalledVersion] = useState("")

  async function getAvailableClients() {
    try {
      const response = await fetch("https://api.vatacars.com/hub/clientInformation", {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      })

      const data = await response.json()

      if (!data[0]) {
        setServerFailedMessage("Unexpected response from the server.")
        return
      }

      setAvailableClients(data)
      setSelectedClient(data[0])

      // Setup IPC listeners if window.ipc exists (desktop app environment)
      if (typeof window !== "undefined" && window.ipc) {
        setupIpcListeners()
      }
    } catch (error) {
      setServerFailedMessage("Unable to contact the server.")
    }
  }

  function setupIpcListeners() {
    window.ipc.on("downloadPluginReply", (arg) => {
      if (arg.status === "running") {
        setClientFailMessage("Close vatSys and try again.")
        setClientStatus("waiting")
        return
      }

      if (arg.status === "downloading") {
        setDownloadStatus(arg.percent)
        return
      }

      if (arg.status === "installing") {
        setClientStatus("installing")
        return
      }

      if (arg.status === "done") {
        setClientStatus("done")
        setDownloadStatus(0)
        setInstalled(true)
        return
      }

      if (arg.status === "failed") {
        setClientFailMessage("Something went wrong, please try again.")
        setClientStatus("waiting")
        return
      }
    })

    window.ipc.on("uninstallPluginReply", (arg) => {
      if (arg.status === "running") {
        setClientFailMessage("Close vatSys and try again.")
        setClientStatus("waiting")
        return
      }

      if (arg.status === "done") {
        setClientStatus("done")
        setDownloadStatus(0)
        setInstalled(false)
        return
      }

      if (arg.status === "failed") {
        setClientFailMessage("Something went wrong, please try again.")
        setClientStatus("waiting")
        return
      }
    })

    window.ipc.on("updateAvailable", () => setUpdateAvailable(true))
    window.ipc.on("updateProgress", (arg) => setUpdateProgress(arg))
    window.ipc.on("updateComplete", () => setUpdateComplete(true))

    window.ipc.on("checkDownloadedPluginReply", (arg) => {
      setInstalledVersion(arg.version)
      setInstalled(arg.installed)
    })
  }

  useEffect(() => {
    // Initialize desktop app specific features if in desktop environment
    if (typeof window !== "undefined" && window.ipc) {
      window.ipc.send("windowControl", "unrestrictSize")
      window.ipc.send("checkDownloadedPlugin", null)
    }
  }, [])

  useEffect(() => {
    // Only fetch clients if user is authenticated
    if (user) {
      getAvailableClients()
    }
  }, [user])

  // Handle authentication states from the first component
  if (isUserLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <PuffLoader size={48} color={"#E2E8F0"} />
      </div>
    )
  }

  if (userError) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-lg font-semibold text-red-500">Something went wrong</h2>
              <p className="mt-2 text-gray-500">Please try again later.</p>
              <Button className="mt-4" variant="outline" onClick={() => window.location.reload()}>
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-lg font-semibold">Not logged in</h2>
              <p className="mt-2 text-gray-500">Please log in to access this page.</p>
              <Button className="mt-4" onClick={() => (window.location.href = "/login")}>
                Go to Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Handle server error state from the second component
  if (serverFailedMessage) {
    return (
      <div className="h-full w-full flex flex-col space-y-4 items-center justify-center">
        <p className="font-semibold text-red-500 text-lg">{serverFailedMessage}</p>
        <span className="text-slate-400">
          Please email{" "}
          <a className="font-semibold hover:underline" href="mailto://contact@vatacars.com">
            contact@vatacars.com
          </a>{" "}
          for assistance.
        </span>
      </div>
    )
  }

  // Handle loading state for client selection
  if (!selectedClient || Object.keys(selectedClient).length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <PuffLoader size={48} color={"#E2E8F0"} />
      </div>
    )
  }

  // Main content after user is logged in and clients are loaded
  return (
    <div className="h-full text-slate-300 bg-slate-900">
      {/* Welcome message from first component */}
      <div className="p-4 bg-slate-800 border-b border-slate-700">
        <h1 className="text-xl font-semibold">Welcome, {user.username}!</h1>
        <p className="text-slate-400">You are now logged in.</p>
      </div>

      {/* Update notification */}
      {updateAvailable && (
        <div
          className="w-full shadow-2xl max-w-xs p-4 text-gray-500 rounded-lg shadow bg-slate-800 fixed top-12 right-5"
          role="alert"
        >
          <div className="flex">
            {updateComplete ? (
              <>
                <div className="inline-flex items-center justify-center flex-shrink-0 w-8 h-8 text-green-200 bg-green-500 rounded-lg">
                  <Check className="h-5 w-5" />
                  <span className="sr-only">Success icon</span>
                </div>
                <div className="ms-3 text-sm font-normal">
                  <span className="mb-1 text-sm font-semibold text-white">Hub update completed!</span>
                  <div className="mb-2 text-sm font-normal">The hub must be restarted to apply the updates.</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <a
                        onClick={() => window.ipc?.send("restartApp", null)}
                        className="cursor-pointer inline-flex justify-center w-full px-2 py-1.5 text-xs font-medium text-center text-white bg-green-500 rounded-lg hover:bg-green-700 focus:ring-4 focus:outline-none focus:ring-green-300"
                      >
                        Restart Now
                      </a>
                    </div>
                    <div>
                      <a
                        onClick={() => setUpdateAvailable(false)}
                        className="cursor-pointer inline-flex justify-center w-full px-2 py-1.5 text-xs font-medium text-center text-gray-900 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 focus:ring-4 focus:outline-none focus:ring-gray-200"
                      >
                        Later
                      </a>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setUpdateAvailable(false)}
                  type="button"
                  className="ms-auto -mx-1.5 -my-1.5 bg-white items-center justify-center flex-shrink-0 text-gray-400 hover:text-gray-900 rounded-lg focus:ring-2 focus:ring-gray-300 p-1.5 hover:bg-gray-100 inline-flex h-8 w-8"
                  aria-label="Close"
                >
                  <span className="sr-only">Close</span>
                  <X className="h-5 w-5" />
                </button>
              </>
            ) : (
              <>
                <div className="inline-flex items-center justify-center flex-shrink-0 w-8 h-8 text-blue-200 bg-blue-500 rounded-lg">
                  <RefreshCw className="h-5 w-5" />
                  <span className="sr-only">Refresh icon</span>
                </div>
                {downloadingUpdate ? (
                  <div className="ms-3 text-sm font-normal flex flex-col space-y-1">
                    <div className="flex flex-row items-center space-x-1">
                      <span className="text-sm font-semibold text-white">Downloading hub update...</span>
                      <span>{updateProgress}%</span>
                    </div>
                    <BarLoader width={192} color={"#3b82f6"} />
                  </div>
                ) : (
                  <>
                    <div className="ms-3 text-sm font-normal">
                      <span className="mb-1 text-sm font-semibold text-white">Hub update available</span>
                      <div className="mb-2 text-sm font-normal">A new software version is available for download.</div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <a
                            onClick={() => {
                              setDownloadingUpdate(true)
                              window.ipc?.send("installUpdate", null)
                            }}
                            className="cursor-pointer inline-flex justify-center w-full px-2 py-1.5 text-xs font-medium text-center text-white bg-blue-500 rounded-lg hover:bg-blue-700 focus:ring-4 focus:outline-none focus:ring-blue-300"
                          >
                            Update
                          </a>
                        </div>
                        <div>
                          <a
                            onClick={() => setUpdateAvailable(false)}
                            className="cursor-pointer inline-flex justify-center w-full px-2 py-1.5 text-xs font-medium text-center text-gray-900 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 focus:ring-4 focus:outline-none focus:ring-gray-200"
                          >
                            Next time
                          </a>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setUpdateAvailable(false)}
                      type="button"
                      className="ms-auto -mx-1.5 -my-1.5 bg-white items-center justify-center flex-shrink-0 text-gray-400 hover:text-gray-900 rounded-lg focus:ring-2 focus:ring-gray-300 p-1.5 hover:bg-gray-100 inline-flex h-8 w-8"
                      aria-label="Close"
                    >
                      <span className="sr-only">Close</span>
                      <X className="h-5 w-5" />
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Main content with sidebar and client details */}
      <div className="flex flex-row">
        <section className="w-64 shrink-0">
          <div className="flex flex-col flex-1">
            <nav
              className="flex flex-col justify-between bg-gradient-to-br from-slate-900 to-slate-800 border-r-2 border-slate-600"
              style={{ height: "calc(100vh - 8rem)" }}
            >
              <div className="text-lg font-semibold text-slate-200 p-4 border-b-2 border-slate-600 flex flex-col items-center">
                <img src="/placeholder.svg?height=32&width=120" alt="Logo" className="h-8" />
              </div>
              <div className="flex flex-col space-y-2">
                {availableClients.map((client, index) => (
                  <div key={index}>
                    {client.latestVersion === "" ? (
                      <div className="relative text-slate-300 px-4 py-2 h-24">
                        <img
                          src={client.bgImageUrl || `/placeholder.svg?height=96&width=256`}
                          alt="Background Image"
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                        <div className="absolute transition-all duration-200 inset-0 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-700 opacity-90" />
                        <div className="flex flex-col relative opacity-50">
                          <span className="transition-all duration-200 font-bold text-shadow-lg text-slate-200 text-xl">
                            {client.name}
                          </span>
                          <span className="text-slate-200 opacity-70 text-sm font-semibold text-shadow-lg">
                            Coming Soon
                          </span>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          if (clientStatus !== "download") setSelectedClient(client)
                        }}
                        className={`relative text-slate-300 px-4 py-2 h-24 w-full text-left ${
                          selectedClient.name === client.name ? "" : "cursor-pointer group"
                        }`}
                        disabled={clientStatus === "download"}
                      >
                        <img
                          src={client.bgImageUrl || `/placeholder.svg?height=96&width=256`}
                          alt="Background Image"
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                        <div
                          className={`absolute transition-all duration-200 inset-0 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-700 ${
                            selectedClient.name === client.name ? "opacity-70" : "opacity-50 group-hover:opacity-70"
                          }`}
                        />
                        <div className="flex flex-col relative">
                          <span
                            className={`transition-all duration-200 font-bold text-shadow-lg ${
                              selectedClient.name === client.name
                                ? "text-slate-200 text-xl"
                                : "text-blue-300 text-lg group-hover:text-slate-300 group-hover:text-xl"
                            }`}
                          >
                            {client.name}
                          </span>
                          <span className="text-slate-200 opacity-70 text-sm font-semibold text-shadow-lg">
                            v{client.latestVersion}
                          </span>
                          {installed &&
                            installedVersion &&
                            client.latestVersion &&
                            cmp(installedVersion, client.latestVersion) === -1 && (
                              <div className="flex mt-2 -mr-2 justify-end">
                                <div className="px-2 py-1 flex items-center justify-center rounded-full animate-pulse bg-green-700 shadow-lg flex flex-row space-x-2">
                                  <span className="text-slate-200 text-xs font-semibold">Update Available</span>
                                </div>
                              </div>
                            )}
                        </div>
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <div className="h-full flex flex-col justify-end">
                <div className="p-4 flex flex-col space-y-2">
                  <a
                    href="https://vatacars.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transition-all duration-200 text-sm flex flex-row space-x-2 items-center cursor-pointer hover:text-slate-400"
                  >
                    <Link className="h-4 w-4" />
                    <span>Visit our Website</span>
                  </a>
                  <a
                    href="https://status.vatacars.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transition-all duration-200 text-sm flex flex-row space-x-2 items-center cursor-pointer hover:text-slate-400"
                  >
                    <Link className="h-4 w-4" />
                    <span>Service Status</span>
                  </a>
                </div>
              </div>
            </nav>
          </div>
        </section>
        <section className="p-12 flex flex-col justify-between" style={{ height: "calc(100vh - 8rem)" }}>
          {/* Product Disclaimer Modal */}
          <Modal title="Product Disclaimer" isOpen={warningShown} onClose={() => setWarningShown(false)}>
            <div className="mt-4 flex flex-col space-y-2 text-justify">
              <span className="text-sm">
                VatACARS is currently available in a prerelease state for public use. Please note that it may not be
                stable or work as expected. By continuing, you acknowledge that you understand the risks associated with
                using this software.
              </span>
            </div>
            <div className="flex flex-row justify-end mt-4">
              <Button
                onClick={() => {
                  setWarningShown(false)
                  setClientStatus("download")
                  setClientFailMessage("")
                  window.ipc?.send("downloadPlugin", {
                    downloadUrl: selectedClient.downloadUrl,
                    client: selectedClient.name,
                    version: selectedClient.availableDownloads?.[selectedClient.selectedDownload]?.version,
                  })
                }}
              >
                Acknowledge
              </Button>
            </div>
          </Modal>

          {/* Client details */}
          <div>
            <div className="flex flex-row space-x-2 border-b-2 border-slate-700">
              <h1 className="text-3xl font-semibold text-slate-200">{selectedClient.name}</h1>
            </div>
            <section className="py-3">
              <h2 className="mt-4 font-semibold tracking-wide text-xl text-slate-200 mb-2">Description</h2>
              <p className="text-[15px] text-slate-500 text-justify">{selectedClient.description}</p>
            </section>
            <section className="py-3">
              <h2 className="font-semibold tracking-wide text-xl text-slate-200 mb-2">Changelog</h2>
              {selectedClient.latestChangelog &&
                selectedClient.latestChangelog.map((log, index) => (
                  <div key={index} className="flex flex-col space-y-2 px-6">
                    {log.logType === 1 ? (
                      <div className="flex flex-row items-center space-x-2">
                        <Check className="h-5 w-5 text-green-400" />
                        <span className="text-slate-300">{log.label}</span>
                      </div>
                    ) : log.logType === 2 ? (
                      <div className="flex flex-row items-center space-x-2">
                        <X className="h-5 w-5 text-red-400" />
                        <span className="text-slate-300">{log.label}</span>
                      </div>
                    ) : (
                      <div className="flex flex-row items-center space-x-2">
                        <Circle className="h-5 w-5 text-blue-400" />
                        <span className="text-slate-300">{log.label}</span>
                      </div>
                    )}
                  </div>
                ))}
            </section>
          </div>

          {/* Installation/Update section */}
          <div className="w-full flex flex-col space-y-2 mt-12">
            {!installed ? (
              <>
                <span className="font-semibold tracking-wide text-xl text-slate-200">Version</span>
                <div className="flex justify-between items-center">
                  <div className="flex flex-row space-x-4">
                    {selectedClient.availableDownloads &&
                      selectedClient.availableDownloads.map((version, index) => (
                        <div
                          key={index}
                          onClick={() =>
                            clientStatus !== "download" &&
                            setSelectedClient({ ...selectedClient, selectedDownload: index })
                          }
                          className={`border-4 shadow-lg rounded-xl h-14 w-36 flex items-center px-4 transition-all duration-200 ${
                            clientStatus !== "download"
                              ? selectedClient.selectedDownload === index
                                ? "border-blue-500 bg-blue-500 cursor-pointer"
                                : "border-blue-500 hover:bg-blue-400 cursor-pointer"
                              : "bg-slate-700 opacity-50"
                          }`}
                        >
                          <div className="flex flex-col -space-y-1">
                            <p className="text-sm font-semibold">{version.label}</p>
                            <span className="text-lg tracking-widest">v{version.version}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                  <div className="flex flex-row items-center space-x-4">
                    <div className="flex flex-col items-center">
                      <button
                        onClick={() => {
                          if (
                            selectedClient.selectedDownload === -1 ||
                            ["download", "installing"].includes(clientStatus)
                          )
                            return
                          return setWarningShown(true)
                        }}
                        disabled={
                          selectedClient.selectedDownload === -1 || ["download", "installing"].includes(clientStatus)
                        }
                        className={`flex flex-row items-center space-x-4 rounded-full py-2 px-4 border-2 text-sm font-semibold ${
                          ["download", "installing"].includes(clientStatus)
                            ? "text-slate-600 border-slate-800 bg-slate-800"
                            : "text-slate-200 border-blue-500 bg-blue-500 hover:bg-blue-400 hover:text-slate-200 cursor-pointer"
                        } transition-all duration-200`}
                      >
                        {clientStatus === "download" ? (
                          <>
                            <p className="font-normal text-slate-500">
                              Downloading{" "}
                              <span className="font-semibold text-slate-200">
                                {selectedClient.availableDownloads?.[selectedClient.selectedDownload]?.label}
                              </span>
                            </p>
                            <BarLoader width={128} color={"#3b82f6"} />
                            <span className="font-light">{downloadStatus}%</span>
                          </>
                        ) : clientStatus === "installing" ? (
                          <>
                            <p className="font-normal text-slate-500">
                              Installing{" "}
                              <span className="font-semibold text-slate-200">
                                {selectedClient.availableDownloads
                                  ? selectedClient.availableDownloads[selectedClient.selectedDownload]?.label
                                  : "..."}
                              </span>
                            </p>
                            <BarLoader width={128} color={"#3b82f6"} />
                          </>
                        ) : (
                          <>
                            <span>
                              Install {selectedClient.name} (
                              {selectedClient.availableDownloads
                                ? selectedClient.availableDownloads[selectedClient.selectedDownload]?.label
                                : "..."}
                              )
                            </span>
                            <Download className="h-5 w-5" />
                          </>
                        )}
                      </button>
                      <span className="text-sm text-red-500">{clientFailMessage}</span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="font-semibold text-lg text-green-400">Installed</span>
                    <span className="text-slate-400">
                      {selectedClient.name} v{installedVersion}
                    </span>
                  </div>

                  <div className="flex flex-row items-center space-x-4">
                    <div className="flex flex-col items-center">
                      {installedVersion &&
                      selectedClient.latestVersion &&
                      cmp(installedVersion, selectedClient.latestVersion) === -1 ? (
                        <button
                          onClick={() => {
                            if (
                              selectedClient.selectedDownload === -1 ||
                              ["download", "installing"].includes(clientStatus)
                            )
                              return
                            setClientStatus("download")
                            setClientFailMessage("")
                            return window.ipc?.send("downloadPlugin", {
                              downloadUrl: selectedClient.downloadUrl,
                              client: selectedClient.name,
                              version: selectedClient.availableDownloads?.[selectedClient.selectedDownload]?.version,
                            })
                          }}
                          disabled={
                            selectedClient.selectedDownload === -1 || ["download", "installing"].includes(clientStatus)
                          }
                          className={`flex flex-row items-center rounded-full py-2 px-4 border-2 text-sm font-semibold ${
                            ["download", "installing"].includes(clientStatus)
                              ? "space-x-4 text-slate-600 border-slate-800 bg-slate-800"
                              : "space-x-2 text-slate-200 border-blue-500 bg-slate-700 hover:bg-blue-400 hover:text-slate-200 cursor-pointer"
                          } transition-all duration-200`}
                        >
                          {clientStatus === "download" ? (
                            <>
                              <p className="font-normal text-slate-500">
                                Downloading{" "}
                                <span className="font-semibold text-slate-200">
                                  {selectedClient.availableDownloads?.[selectedClient.selectedDownload]?.label}
                                </span>
                              </p>
                              <BarLoader width={128} color={"#3b82f6"} />
                              <span className="font-light">{downloadStatus}%</span>
                            </>
                          ) : clientStatus === "installing" ? (
                            <>
                              <p className="font-normal text-slate-500">
                                Installing{" "}
                                <span className="font-semibold text-slate-200">
                                  {selectedClient.availableDownloads
                                    ? selectedClient.availableDownloads[selectedClient.selectedDownload]?.label
                                    : "..."}
                                </span>
                              </p>
                              <BarLoader width={128} color={"#3b82f6"} />
                            </>
                          ) : (
                            <>
                              <span>
                                Update {selectedClient.name} (
                                {selectedClient.availableDownloads
                                  ? selectedClient.availableDownloads[selectedClient.selectedDownload]?.label
                                  : "..."}
                                )
                              </span>
                              <Download className="h-5 w-5" />
                            </>
                          )}
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            if (selectedClient.selectedDownload === -1 || ["uninstalling"].includes(clientStatus))
                              return
                            setClientStatus("uninstalling")
                            return window.ipc?.send("uninstallPlugin", {
                              client: selectedClient.name,
                              version: selectedClient.availableDownloads?.[selectedClient.selectedDownload]?.version,
                            })
                          }}
                          disabled={selectedClient.selectedDownload === -1 || ["uninstalling"].includes(clientStatus)}
                          className={`flex flex-row items-center rounded-full py-2 px-4 border-2 text-sm font-semibold ${
                            ["uninstalling"].includes(clientStatus)
                              ? "space-x-4 text-slate-600 border-slate-800 bg-slate-800"
                              : "space-x-2 text-slate-200 border-red-500 bg-slate-700 hover:bg-red-400 hover:text-slate-200 cursor-pointer"
                          } transition-all duration-200`}
                        >
                          {clientStatus === "uninstalling" ? (
                            <>
                              <p className="font-normal text-slate-500">
                                Uninstalling{" "}
                                <span className="font-semibold text-slate-200">
                                  {selectedClient.availableDownloads
                                    ? selectedClient.availableDownloads[selectedClient.selectedDownload]?.label
                                    : "..."}
                                </span>
                              </p>
                              <BarLoader width={128} color={"#3b82f6"} />
                            </>
                          ) : (
                            <>
                              <span>
                                Uninstall {selectedClient.name} (
                                {selectedClient.availableDownloads
                                  ? selectedClient.availableDownloads[selectedClient.selectedDownload]?.label
                                  : "..."}
                                )
                              </span>
                              <Trash2 className="h-5 w-5" />
                            </>
                          )}
                        </button>
                      )}
                    </div>
                    <span className="text-sm text-red-500">{clientFailMessage}</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

