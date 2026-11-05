/** PDF на телефоне: HTML → файл PDF → системное «Поделиться». */
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

export async function exportPdf(html: string, fileTitle: string): Promise<void> {
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      UTI: 'com.adobe.pdf',
      dialogTitle: fileTitle,
    });
  } else {
    await Print.printAsync({ uri });
  }
}
