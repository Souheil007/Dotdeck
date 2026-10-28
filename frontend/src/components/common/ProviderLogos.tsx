import React from 'react';

interface LogoProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  className?: string;
}

/**
 * OpenAI official rosette / vortex vector logo.
 */
export function OpenAILogo({ size = 20, className = '', ...props }: LogoProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.8956zm16.0993 3.8558L12.5973 8.3829l2.02-1.1638a.0804.0804 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.402-.686zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.6069 1.4997-2.602-1.4997z" />
    </svg>
  );
}

/**
 * xAI Grok official geometric vector logo.
 */
export function GrokLogo({ size = 20, className = '', ...props }: LogoProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

/**
 * Meta official infinity ribbon vector logo.
 */
export function MetaMuseLogo({ size = 20, className = '', ...props }: LogoProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M12 7.15c-2.4 0-4.45 1.35-5.63 3.37-1.13-1.85-2.88-3.37-5.17-3.37C.52 7.15 0 8.08 0 9.68c0 3.07 2.45 6.04 4.88 8.08 1.91 1.62 4.07 2.69 5.67 2.69 1.57 0 3.23-.89 5.15-2.69 2.43-2.04 4.88-5.01 4.88-8.08 0-1.6-.52-2.53-1.2-2.53-2.29 0-4.04 1.52-5.17 3.37-1.18-2.02-3.23-3.37-5.63-3.37zm-.03 2.53c1.7 0 3.29.98 4.21 2.55l.89 1.52.89-1.52c.92-1.57 2.51-2.55 4.21-2.55 1.78 0 3.35 1.01 4.17 2.53.52.96.8 2.05.8 3.26 0 1.22-.28 2.31-.8 3.27-.82 1.52-2.39 2.53-4.17 2.53-1.7 0-3.29-.98-4.21-2.55l-.89-1.52-.89 1.52c-.92 1.57-2.51 2.55-4.21 2.55-1.78 0-3.35-1.01-4.17-2.53-.52-.96-.8-2.05-.8-3.27 0-1.21.28-2.3.8-3.26.82-1.52 2.39-2.53 4.17-2.53z" />
    </svg>
  );
}

/**
 * Anthropic Claude official multi-facet starburst vector logo.
 */
export function ClaudeLogo({ size = 20, className = '', ...props }: LogoProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M12 1.5l1.65 4.75a1.2 1.2 0 0 0 .75.75L19.15 8.65a1.2 1.2 0 0 1 0 2.26l-4.75 1.65a1.2 1.2 0 0 0-.75.75L12 18.06l-1.65-4.75a1.2 1.2 0 0 0-.75-.75L4.85 10.91a1.2 1.2 0 0 1 0-2.26l4.75-1.65a1.2 1.2 0 0 0 .75-.75L12 1.5zm6.5 13.5l.8 2.3a.6.6 0 0 0 .37.37l2.3.8a.6.6 0 0 1 0 1.13l-2.3.8a.6.6 0 0 0-.37.37l-.8 2.3a.6.6 0 0 1-1.13 0l-.8-2.3a.6.6 0 0 0-.37-.37l-2.3-.8a.6.6 0 0 1 0-1.13l2.3-.8a.6.6 0 0 0 .37-.37l.8-2.3a.6.6 0 0 1 1.13 0z" />
    </svg>
  );
}

/**
 * Unified provider logo dispatcher.
 */
export function ProviderLogo({
  provider,
  size = 20,
  className = '',
}: {
  provider: string;
  size?: number | string;
  className?: string;
}) {
  switch (provider) {
    case 'openai_dot':
      return <OpenAILogo size={size} className={className} />;
    case 'grok_bot':
      return <GrokLogo size={size} className={className} />;
    case 'meta_muse':
      return <MetaMuseLogo size={size} className={className} />;
    case 'claude':
      return <ClaudeLogo size={size} className={className} />;
    default:
      return <OpenAILogo size={size} className={className} />;
  }
}
