/**
 * PDF в браузере: expo-print в вебе печатает только текущую страницу,
 * поэтому открываем документ в отдельном окне и вызываем печать — там «Сохранить как PDF».
 */
export async function exportPdf(html: string, _fileTitle: string): Promise<void> {
  const win = window.open('', '_blank');
  if (!win) throw new Error('popup_blocked');
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  // Даём браузеру разложить страницу перед печатью.
  await new Promise((resolve) => setTimeout(resolve, 300));
  win.print();
}
