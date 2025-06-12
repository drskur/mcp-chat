/**
 * 파일 타입에 따른 아이콘 타입을 반환합니다
 */
export const getFileIconType = (fileType: string): string => {
  if (fileType.includes('pdf')) return 'pdf';
  if (fileType.includes('word') || fileType.includes('doc')) return 'doc';
  if (
    fileType.includes('excel') ||
    fileType.includes('sheet') ||
    fileType.includes('xls') ||
    fileType.includes('csv')
  )
    return 'sheet';
  if (
    fileType.includes('text') ||
    fileType.includes('markdown') ||
    fileType.includes('txt') ||
    fileType.includes('md')
  )
    return 'text';
  if (
    fileType.includes('image') ||
    fileType.includes('png') ||
    fileType.includes('jpg') ||
    fileType.includes('jpeg') ||
    fileType.includes('gif')
  )
    return 'image';
  if (fileType.includes('html') || fileType.includes('htm')) return 'html';
  if (fileType.includes('json') || fileType.includes('xml')) return 'code';
  if (
    fileType.includes('zip') ||
    fileType.includes('rar') ||
    fileType.includes('tar') ||
    fileType.includes('gz')
  )
    return 'archive';
  if (fileType.includes('ppt') || fileType.includes('presentation'))
    return 'presentation';
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

/**
 * 지원되는 파일 확장자인지 확인합니다 (텍스트 및 이미지 파일만)
 */
export const getSupportedFileExtensions = (): {
  text: string[];
  image: string[];
} => {
  return {
    text: [
      'TXT',
      'MD',
      'JSON',
      'XML',
      'HTML',
      'HTM',
      'CSS',
      'JS',
      'TS',
      'JSX',
      'TSX',
      'PY',
      'JAVA',
      'C',
      'CPP',
      'H',
      'HPP',
      'CS',
      'PHP',
      'RB',
      'GO',
      'RS',
      'SWIFT',
      'KT',
      'SCALA',
      'R',
      'SQL',
      'SH',
      'BAT',
      'PS1',
      'YML',
      'YAML',
      'TOML',
      'INI',
      'CFG',
      'CONF',
      'LOG',
      'CSV',
      'TSV',
      'RTF',
      'TEX',
      'LATEX',
    ],
    image: [
      'JPG',
      'JPEG',
      'PNG',
      'GIF',
      'BMP',
      'WEBP',
      'SVG',
      'ICO',
      'TIFF',
      'TIF',
    ],
  };
};

/**
 * 파일이 지원되는 확장자인지 확인합니다
 */
export const isSupportedFileExtension = (filename: string): boolean => {
  const extension = getFileExtension(filename);
  const supported = getSupportedFileExtensions();
  return [...supported.text, ...supported.image].includes(extension);
};

/**
 * 파일이 텍스트 파일인지 확인합니다
 */
export const isTextFile = (filename: string): boolean => {
  const extension = getFileExtension(filename);
  return getSupportedFileExtensions().text.includes(extension);
};

/**
 * 파일이 이미지 파일인지 확인합니다
 */
export const isImageFile = (filename: string): boolean => {
  const extension = getFileExtension(filename);
  return getSupportedFileExtensions().image.includes(extension);
};

/**
 * 모델의 capabilities에 따라 HTML input accept 속성 문자열을 생성합니다
 */
export const getFileAcceptStringByCapabilities = (
  capabilities: string[],
): string => {
  const { text } = getSupportedFileExtensions();
  const acceptTypes: string[] = [];

  // 텍스트 capability가 있으면 텍스트 파일 확장자 추가
  if (capabilities.includes('text')) {
    const textTypes = text.map((ext) => `.${ext.toLowerCase()}`);
    acceptTypes.push(...textTypes);
  }

  // 이미지 capability가 있으면 이미지 파일 타입 추가
  if (capabilities.includes('image')) {
    acceptTypes.push('image/*');
  }

  return acceptTypes.join(',');
};
