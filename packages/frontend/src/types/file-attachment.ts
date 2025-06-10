export interface FileAttachment {
  id: string;
  file: File;
  type: string;
  previewUrl?: string;
  fileId?: string;
}