export type colorTheme = {
    id?: string,
    name: string,
    colorCode: string,
    code?: string,
}

type themeOptions = {
    cover: string,
    thumbnail: string,
    colorDisabled: boolean,
    darkmodeDisabled: boolean,
    colors?: colorTheme[],
    bubbleStyle?: string,
    darkmodeStyle?: string,
}

export interface Theme {
    id: string,
    createdAt: string,
    updatedAt: string,
    name: string,
    description: string,
    style: string,
    options: themeOptions,
    author?: string,
    keyword?: string,
    version: string,
    code?: string,
    isBuiltIn?: boolean,
}