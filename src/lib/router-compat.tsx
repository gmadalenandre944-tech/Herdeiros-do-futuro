/**
 * Small compatibility layer so pages written for react-router-dom keep
 * working on top of TanStack Router.
 */
import {
  Link as TanstackLink,
  useNavigate as useTanstackNavigate,
  useLocation as useTanstackLocation,
  useParams as useTanstackParams,
} from "@tanstack/react-router";
import { useEffect, type ComponentProps, type ReactNode } from "react";

type AnyLinkProps = Omit<ComponentProps<"a">, "href"> & {
  to: string;
  replace?: boolean;
  state?: unknown;
  children?: ReactNode;
};

export function Link({ to, replace, state: _state, ...rest }: AnyLinkProps) {
  return <TanstackLink to={to as never} replace={replace} {...(rest as object)} />;
}

type NavLinkRenderProps = { isActive: boolean; isPending: boolean };

export type NavLinkProps = Omit<AnyLinkProps, "className" | "children"> & {
  className?: string | ((props: NavLinkRenderProps) => string);
  children?: ReactNode | ((props: NavLinkRenderProps) => ReactNode);
  end?: boolean;
};

export function NavLink({ to, className, children, end, ...rest }: NavLinkProps) {
  const location = useTanstackLocation();
  const isActive = end ? location.pathname === to : location.pathname.startsWith(to);
  const state: NavLinkRenderProps = { isActive, isPending: false };
  return (
    <TanstackLink
      to={to as never}
      className={typeof className === "function" ? className(state) : className}
      {...(rest as object)}
    >
      {typeof children === "function" ? children(state) : children}
    </TanstackLink>
  );
}

export function useNavigate() {
  const navigate = useTanstackNavigate();
  return (to: string | number, options?: { replace?: boolean }) => {
    if (typeof to === "number") {
      if (typeof window !== "undefined") window.history.go(to);
      return;
    }
    void navigate({ to: to as never, replace: options?.replace });
  };
}

export function useLocation() {
  const location = useTanstackLocation();
  return {
    pathname: location.pathname,
    search: location.searchStr,
    hash: location.hash,
    state: location.state,
  };
}

export function useParams<T extends Record<string, string> = Record<string, string>>() {
  return (useTanstackParams as any)({ strict: false }) as T;
}

export function useSearchParams(): [URLSearchParams, (next: URLSearchParams) => void] {
  const location = useTanstackLocation();
  const navigate = useTanstackNavigate();
  const params = new URLSearchParams(location.searchStr);
  const setParams = (next: URLSearchParams) => {
    void navigate({ to: `${location.pathname}?${next.toString()}` as never });
  };
  return [params, setParams];
}

export function Navigate({ to, replace }: { to: string; replace?: boolean }) {
  const navigate = useTanstackNavigate();
  useEffect(() => {
    void navigate({ to: to as never, replace });
  }, [to, replace, navigate]);
  return null;
}
