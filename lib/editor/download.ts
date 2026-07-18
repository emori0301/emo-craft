/** data URL をファイルとしてダウンロードする */
export function downloadDataUrl(dataUrl: string, filename: string): void {
	const a = document.createElement("a");
	a.href = dataUrl;
	a.download = filename;
	a.click();
}

/** Blob を data URL に変換する */
export function blobToDataUrl(blob: Blob): Promise<string> {
	return new Promise<string>((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result as string);
		reader.onerror = reject;
		reader.readAsDataURL(blob);
	});
}
