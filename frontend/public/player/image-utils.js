export function resizeImageFile(
    file,
    {
        maxWidth = 900,
        maxHeight = 900,
        quality = 0.86,
    } = {},
) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
            const img = new Image();

            img.onload = () => {
                let width = img.width;
                let height = img.height;

                if (!width || !height) {
                    reject(new Error("Ungültige Bildgröße."));
                    return;
                }

                const scale = Math.min(
                    1,
                    maxWidth / width,
                    maxHeight / height,
                );

                const targetWidth = Math.max(
                    1,
                    Math.round(width * scale),
                );

                const targetHeight = Math.max(
                    1,
                    Math.round(height * scale),
                );

                const canvas = document.createElement("canvas");
                canvas.width = targetWidth;
                canvas.height = targetHeight;

                const ctx = canvas.getContext("2d");

                if (!ctx) {
                    reject(
                        new Error(
                            "Canvas-Kontext konnte nicht erstellt werden.",
                        ),
                    );
                    return;
                }

                ctx.drawImage(
                    img,
                    0,
                    0,
                    targetWidth,
                    targetHeight,
                );

                const dataUrl =
                    canvas.toDataURL("image/jpeg", quality);

                resolve(dataUrl);
            };

            img.onerror = () =>
                reject(
                    new Error("Bild konnte nicht geladen werden."),
                );

            img.src = String(reader.result || "");
        };

        reader.onerror = () => {
            reject(
                reader.error ||
                new Error(
                    "Datei konnte nicht gelesen werden.",
                ),
            );
        };

        reader.readAsDataURL(file);
    });
}