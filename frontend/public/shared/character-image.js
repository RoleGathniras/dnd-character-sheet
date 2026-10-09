export function getCharacterImageDataUrl(character) {
    return (
        character?.data?.description?.appearance?.imageDataUrl ||
        character?.data?.character_description?.appearance?.imageDataUrl ||
        character?.data?.appearance?.imageDataUrl ||
        ""
    );
}

export function getCharacterImageCrop(character) {
    const crop =
        character?.data?.description?.appearance?.imageCrop ||
        character?.data?.character_description?.appearance?.imageCrop ||
        character?.data?.appearance?.imageCrop ||
        null;

    return {
        x: Number(crop?.x ?? 50),
        y: Number(crop?.y ?? 50),
        zoom: Number(crop?.zoom ?? 1),
    };
}