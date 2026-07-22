import AdmZip from "adm-zip";

export function extractCourseZip(zipFilePath: string, destinationDir: string): void {
  const zip = new AdmZip(zipFilePath);
  zip.extractAllTo(destinationDir, true);
}
