import { AdminShell } from "@/components/AdminShell";
import { useApks } from "./hooks/use-apks";
import { ApkUploadCard } from "./components/ApkUploadCard";
import { ApkList } from "./components/ApkList";

export function AppApkPage() {
  const {
    apks,
    loading,
    uploading,
    busyName,
    loadApks,
    handleUpload,
    handleDownload,
    handleDelete,
  } = useApks();

  return (
    <AdminShell title="App APK">
      <div className="max-w-4xl space-y-6">
        <ApkUploadCard uploading={uploading} onUpload={handleUpload} />
        <ApkList
          apks={apks}
          loading={loading}
          busyName={busyName}
          onRefresh={() => void loadApks()}
          onDownload={handleDownload}
          onDelete={handleDelete}
        />
      </div>
    </AdminShell>
  );
}
