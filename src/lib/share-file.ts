/** Текстовый файл (CSV) на телефоне: сохранить во временную папку и открыть «Поделиться». */
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export async function shareTextFile(
  fileName: string,
  content: string,
  mimeType: string,
): Promise<void> {
  const file = new File(Paths.cache, fileName);
  if (file.exists) file.delete();
  file.create();
  file.write(content);
  await Sharing.shareAsync(file.uri, { mimeType, dialogTitle: fileName });
}
