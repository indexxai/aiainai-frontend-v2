// Products shown in the Zodiac launcher (same order as the indexx home page).
const A = "/launcher/";

export type LauncherProduct = {
  id: string;
  name: string;
  url: () => string;
  dark: string;
  light: string;
  /** Extra CSS filter for the light-mode icon (e.g. invert a white logo). */
  lightFilter?: string;
};

export const LAUNCHER_PRODUCTS: LauncherProduct[] = [
  { id: "bitcoin-yay", name: "Bitcoin Yay", url: () => "https://bitcoinyay.com", dark: A + "bitcoinyayLogo.webp", light: A + "bitcoinyayLogo.webp" },
  { id: "captain-jack", name: "Captain Jack", url: () => "http://jacksai.si/", dark: A + "captainJackLogo.png", light: A + "captainJackLogo.png" },
  { id: "crypto-treasury", name: "Crypto Treasury", url: () => "https://cex.indexx.ai/crypto-treasury", dark: A + "CryptoTreasuryLogo.webp", light: A + "CryptoTreasuryLogo.webp" },
  { id: "emmm", name: "Eeny Meeny Miny Moe", url: () => "https://eenymeenyminymoe.io/", dark: A + "EmmmLogo.webp", light: A + "EmmmLogo.webp" },
  { id: "exchange", name: "Exchange", url: () => "https://cex.indexx.ai/update/home", dark: A + "ExchangeLogo.webp", light: A + "ExchangeLogo.webp" },
  { id: "fantasy-lotto", name: "Fantasy Lotto", url: () => "https://lotto.indexx.ai/", dark: A + "fantasyLottoLogo.png", light: A + "fantasyLottoLogo.png" },
  { id: "indexx-pay", name: "Indexx Pay", url: () => "https://pay.indexx.ai/", dark: A + "indexxPayLogo.png", light: A + "indexxPayLogo.png" },
  { id: "indexx-wallet", name: "Indexx Wallet", url: () => "https://wallet.indexx.ai/", dark: A + "indexxWalletLogo.png", light: A + "indexxWalletLogo.png" },
  { id: "jacks-ai", name: "Jack's AI", url: () => "http://jackai.si/", dark: A + "jacksAiLogo.png", light: A + "jacksAiLogo.png" },
  { id: "rehumen-lab", name: "ReHumen Lab", url: () => "https://rehumenlab.com/", dark: A + "reHumanLabLogoDark.png", light: A + "reHumanLabLogo.png" },
  { id: "shoperpal", name: "ShoperPal", url: () => "https://test.shoperpal.com/", dark: A + "shoperPalLogo.png", light: A + "shoperPalLogo.png" },
  { id: "usdxx", name: "USDXX", url: () => "https://usdxxlynx.com", dark: A + "UsdxxLogo.webp", light: A + "UsdxxLogo.webp" },
  { id: "wallstreet", name: "Wallstreet", url: () => "https://wallstreet.indexx.ai/", dark: A + "wallstreetLogo.webp", light: A + "wallstreetLogo.webp", lightFilter: "invert(1)" },
  { id: "xtokens", name: "xTokens", url: () => "https://indexx.ai/xtokens", dark: A + "XCryptoLogo.webp", light: A + "XCryptoLogo.webp" },
  { id: "xxemail", name: "XXEmail", url: () => "https://test.xxemail.com/", dark: A + "xxEmailLogo.png", light: A + "xxEmailLogo.png" },
  { id: "yaysapp", name: "YaysApp", url: () => "https://web.yaysapp.com", dark: A + "YaysAppLogo.webp", light: A + "YaysAppLogo.webp" },
];

// Where "Explore Zodiac" in the launcher panel goes.
export const ZODIAC_URL = "https://test.indexx.ai";
