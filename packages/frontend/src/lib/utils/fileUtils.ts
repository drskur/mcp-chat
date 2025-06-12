/**
 * 파일 타입에 따른 아이콘 타입을 반환합니다
 */
export const getFileIconType = (fileType: string): string => {
  if (fileType.includes('pdf')) return 'pdf';
  if (fileType.includes('word') || fileType.includes('doc')) return 'doc';
  if (fileType.includes('excel') || fileType.includes('sheet') || fileType.includes('xls') || fileType.includes('csv')) return 'sheet';
  if (fileType.includes('text') || fileType.includes('markdown') || fileType.includes('txt') || fileType.includes('md')) return 'text';
  if (fileType.includes('image') || fileType.includes('png') || fileType.includes('jpg') || fileType.includes('jpeg') || fileType.includes('gif')) return 'image';
  if (fileType.includes('html') || fileType.includes('htm')) return 'html';
  if (fileType.includes('json') || fileType.includes('xml')) return 'code';
  if (fileType.includes('zip') || fileType.includes('rar') || fileType.includes('tar') || fileType.includes('gz')) return 'archive';
  if (fileType.includes('ppt') || fileType.includes('presentation')) return 'presentation';
  return 'generic';
};

/**
 * 파일 크기를 사람이 읽기 쉬운 형태로 포맷합니다
 */
export const formatFileSize = (sizeInBytes: number): string => {
  if (sizeInBytes < 1024 * 1024) {
    return `${Math.round(sizeInBytes / 1024)} KB`;
  }
  return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
};

/**
 * 파일명에서 확장자를 추출합니다
 */
export const getFileExtension = (filename: string): string => {
  return filename.split('.').pop()?.toUpperCase() || '';
};