import { isCyberWallet } from '@cyberlab/cyber-app-sdk'
import { WalletConfigV2 } from '@pancakeswap/ui-wallets'
import { WalletFilledIcon } from '@pancakeswap/uikit'
import { getTrustWalletProvider } from '@pancakeswap/wagmi/connectors/trustWallet'
import type { ExtendEthereum } from 'global'
import { isMobile } from 'react-device-detect'
import { Config } from 'wagmi'
import { ConnectMutateAsync } from 'wagmi/query'
import { chains, createWagmiConfig, walletConnectNoQrCodeConnector } from '../utils/wagmi'
import { ASSET_CDN } from './constants/endpoints'

export enum ConnectorNames {
  MetaMask = 'metaMaskSDK',
  Injected = 'injected',
  WalletConnect = 'walletConnect',
  WalletConnectV1 = 'walletConnectLegacy',
  // BSC = 'bsc',
  BinanceW3W = 'BinanceW3WSDK',
  Blocto = 'blocto',
  WalletLink = 'coinbaseWalletSDK',
  // Ledger = 'ledger',
  TrustWallet = 'trust',
  CyberWallet = 'cyberWallet',
}

const createQrCode =
  <config extends Config = Config, context = unknown>(
    chainId: number,
    connect: ConnectMutateAsync<config, context>,
    connectorId: ConnectorNames,
  ) =>
  async () => {
    const wagmiConfig = createWagmiConfig()
    const selectedConnector = wagmiConfig.connectors.find((connector) => connector.id === connectorId)
    if (!selectedConnector) {
      return ''
    }

    const isMetaMaskInstalled = isMobile ? false : typeof window !== 'undefined' && window.ethereum?.isMetaMask === true
    if (connectorId === ConnectorNames.MetaMask && isMetaMaskInstalled) {
      return ''
    }

    // HACK: utilizing event emitter from connector to notify wagmi of the connect events
    const connector =
      selectedConnector.id === ConnectorNames.Injected
        ? {
            ...walletConnectNoQrCodeConnector({
              chains,
              emitter: selectedConnector?.emitter,
            }),
            emitter: selectedConnector.emitter,
            uid: selectedConnector.uid,
          }
        : selectedConnector

    const provider = await connector.getProvider()

    return new Promise<string>((resolve) => {
      // Wagmi v2 doesn't have a return type for provider yet
      provider.on('display_uri', (uri) => {
        resolve(uri)
      })
      connect({ connector, chainId })
    })
  }

const hasInjectedInstalled = () => {
  if (typeof window === 'undefined') {
    return false
  }

  // If injected but without specific wagmi connector
  if (window.ethereum !== undefined && !window.ethereum?.isMetaMask && !window.ethereum?.isCoinbaseWallet) {
    return true
  }

  return false
}

function isBinanceWeb3WalletInstalled() {
  return typeof window !== 'undefined' && Boolean((window.ethereum as ExtendEthereum)?.isBinance)
}

const walletsConfig = <config extends Config = Config, context = unknown>({
  chainId,
  connect,
}: {
  chainId: number
  connect: ConnectMutateAsync<config, context>
}): WalletConfigV2<ConnectorNames>[] => {
  const walletConnectQrCode = createQrCode(chainId, connect, ConnectorNames.Injected)
  return [
    {
      id: 'metamask',
      title: 'Metamask',
      icon: `${ASSET_CDN}/web/wallets/metamask.png`,
      connectorId: ConnectorNames.MetaMask,
      get installed() {
        return isMobile ? undefined : typeof window !== 'undefined' && window.ethereum?.isMetaMask === true
      },
      downloadLink: 'https://chrome.google.com/webstore/detail/metamask/nkbihfbeogaeaoehlefnkodbefgpgknn',
      guide: {
        desktop: 'https://metamask.io/download',
        mobile: 'https://metamask.io/download',
      },
      qrCode: createQrCode(chainId, connect, ConnectorNames.MetaMask),
    },
    {
      id: 'trust',
      title: 'Trust Wallet',
      icon: `${ASSET_CDN}/web/wallets/trust.png`,
      connectorId: ConnectorNames.TrustWallet,
      get installed() {
        return !!getTrustWalletProvider()
      },
      deepLink: 'https://link.trustwallet.com/open_url?coin_id=20000714&url=https://pancakeswap.finance/',
      downloadLink: 'https://chrome.google.com/webstore/detail/trust-wallet/egjidjbpglichdcondbcbdnbeeppgdph',
      guide: {
        desktop: 'https://trustwallet.com/browser-extension',
        mobile: 'https://trustwallet.com/',
      },
      qrCode: walletConnectQrCode,
    },
    {
      id: 'okx',
      title: 'OKX Wallet',
      icon: `${ASSET_CDN}/web/wallets/okx-wallet.png`,
      connectorId: ConnectorNames.Injected,
      get installed() {
        return typeof window !== 'undefined' && Boolean(window.okxwallet)
      },
      downloadLink: 'https://chromewebstore.google.com/detail/okx-wallet/mcohilncbfahbmgdjkbpemcciiolgcge',
      deepLink:
        'https://www.okx.com/download?deeplink=okx%3A%2F%2Fwallet%2Fdapp%2Furl%3FdappUrl%3Dhttps%253A%252F%252Fpancakeswap.finance',
      guide: {
        desktop: 'https://www.okx.com/web3',
        mobile: 'https://www.okx.com/web3',
      },
    },
    {
      id: 'BinanceW3W',
      title: 'Binance Web3 Wallet',
      icon: `${ASSET_CDN}/web/wallets/binance-w3w.png`,
      connectorId: isBinanceWeb3WalletInstalled() ? ConnectorNames.Injected : ConnectorNames.BinanceW3W,
      get installed() {
        if (isBinanceWeb3WalletInstalled()) {
          return true
        }
        // still showing the SDK if not installed
        return undefined
      },
    },
    {
      id: 'coinbase',
      title: 'Coinbase Wallet',
      icon: `${ASSET_CDN}/web/wallets/coinbase.png`,
      connectorId: ConnectorNames.WalletLink,
    },
    {
      id: 'walletconnect',
      title: 'WalletConnect',
      icon: `${ASSET_CDN}/web/wallets/walletconnect.png`,
      connectorId: ConnectorNames.WalletConnect,
    },
    {
      id: 'opera',
      title: 'Opera Wallet',
      icon: `${ASSET_CDN}/web/wallets/opera.png`,
      connectorId: ConnectorNames.Injected,
      get installed() {
        return typeof window !== 'undefined' && Boolean(window.ethereum?.isOpera)
      },
      downloadLink: 'https://www.opera.com/crypto/next',
    },
    {
      id: 'brave',
      title: 'Brave Wallet',
      icon: `${ASSET_CDN}/web/wallets/brave.png`,
      connectorId: ConnectorNames.Injected,
      get installed() {
        return typeof window !== 'undefined' && Boolean(window.ethereum?.isBraveWallet)
      },
      downloadLink: 'https://brave.com/wallet/',
    },
    {
      id: 'rabby',
      title: 'Rabby Wallet',
      icon: `${ASSET_CDN}/web/wallets/rabby.png`,
      get installed() {
        return typeof window !== 'undefined' && Boolean(window.ethereum?.isRabby)
      },
      connectorId: ConnectorNames.Injected,
      guide: {
        desktop: 'https://rabby.io/',
      },
      downloadLink: {
        desktop: 'https://chrome.google.com/webstore/detail/rabby/acmacodkjbdgmoleebolmdjonilkdbch',
      },
    },
    {
      id: 'math',
      title: 'MathWallet',
      icon: `${ASSET_CDN}/web/wallets/mathwallet.png`,
      connectorId: ConnectorNames.Injected,
      get installed() {
        return typeof window !== 'undefined' && Boolean(window.ethereum?.isMathWallet)
      },
      qrCode: walletConnectQrCode,
    },
    {
      id: 'tokenpocket',
      title: 'TokenPocket',
      icon: `${ASSET_CDN}/web/wallets/tokenpocket.png`,
      connectorId: ConnectorNames.Injected,
      get installed() {
        return typeof window !== 'undefined' && Boolean(window.ethereum?.isTokenPocket)
      },
      qrCode: walletConnectQrCode,
    },
    {
      id: 'safepal',
      title: 'SafePal',
      icon: `${ASSET_CDN}/web/wallets/safepal.png`,
      connectorId: ConnectorNames.Injected,
      get installed() {
        return typeof window !== 'undefined' && Boolean((window.ethereum as ExtendEthereum)?.isSafePal)
      },
      downloadLink:
        'https://chrome.google.com/webstore/detail/safepal-extension-wallet/lgmpcpglpngdoalbgeoldeajfclnhafa',
      qrCode: walletConnectQrCode,
    },
    {
      id: 'coin98',
      title: 'Coin98',
      icon: `${ASSET_CDN}/web/wallets/coin98.png`,
      connectorId: ConnectorNames.Injected,
      get installed() {
        return (
          typeof window !== 'undefined' &&
          (Boolean((window.ethereum as ExtendEthereum)?.isCoin98) || Boolean(window.coin98))
        )
      },
      qrCode: walletConnectQrCode,
    },
    {
      id: 'blocto',
      title: 'Blocto',
      icon: `${ASSET_CDN}/web/wallets/blocto.png`,
      connectorId: ConnectorNames.Blocto,
      get installed() {
        return typeof window !== 'undefined' && Boolean((window.ethereum as ExtendEthereum)?.isBlocto)
          ? true
          : undefined // undefined to show SDK
      },
    },
    {
      id: 'cyberwallet',
      title: 'CyberWallet',
      icon: `${ASSET_CDN}/web/wallets/cyberwallet.png`,
      connectorId: ConnectorNames.CyberWallet,
      get installed() {
        return typeof window !== 'undefined' && isCyberWallet()
      },
      isNotExtension: true,
      guide: {
        desktop: 'https://docs.cyber.co/sdk/cyber-account#supported-chains',
      },
    },
    // {
    //   id: 'ledger',
    //   title: 'Ledger',
    //   icon: `${ASSET_CDN}/web/wallets/ledger.png`,
    //   connectorId: ConnectorNames.Ledger,
    // },
  ]
}

export const createWallets = <config extends Config = Config, context = unknown>(
  chainId: number,
  connect: ConnectMutateAsync<config, context>,
) => {
  const config = walletsConfig({ chainId, connect })

  const hasInjected = hasInjectedInstalled()

  return hasInjected && config.some((c) => c.installed && c.connectorId === ConnectorNames.Injected)
    ? config // add injected icon if none of injected type wallets installed
    : [
        ...config,
        {
          id: 'injected',
          title: 'Injected',
          icon: WalletFilledIcon,
          connectorId: ConnectorNames.Injected,
          installed: hasInjected,
        },
      ]
}

const docLangCodeMapping: Record<string, string> = {
  it: 'italian',
  ja: 'japanese',
  fr: 'french',
  tr: 'turkish',
  vi: 'vietnamese',
  id: 'indonesian',
  'zh-cn': 'chinese',
  'pt-br': 'portuguese-brazilian',
}

export const getDocLink = (code: string) =>
  docLangCodeMapping[code]
    ? `https://docs.pancakeswap.finance/v/${docLangCodeMapping[code]}/get-started/wallet-guide`
    : `https://docs.pancakeswap.finance/get-started/wallet-guide`
