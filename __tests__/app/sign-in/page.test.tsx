import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// vi.hoisted ensures these are available inside the vi.mock factory (which is hoisted)
const { SignInMock } = vi.hoisted(() => {
  const SignInMock = vi.fn((props: Record<string, unknown>) => (
    <div data-testid="clerk-sign-in" data-redirect={props.forceRedirectUrl as string} />
  ));
  return { SignInMock };
});

vi.mock("@clerk/nextjs", () => ({
  SignIn: SignInMock,
}));

import SignInPage from "@/app/sign-in/[[...sign-in]]/page";

describe("SignInPage", () => {
  it("renders without crashing", () => {
    render(<SignInPage />);
    expect(screen.getByTestId("clerk-sign-in")).toBeInTheDocument();
  });

  it("passes forceRedirectUrl='/' to the SignIn component", () => {
    render(<SignInPage />);
    expect(SignInMock).toHaveBeenCalled();
    const receivedProps = SignInMock.mock.calls[0][0];
    expect(receivedProps.forceRedirectUrl).toBe("/");
  });

  it("renders a <main> element as the root container", () => {
    const { container } = render(<SignInPage />);
    expect(container.querySelector("main")).toBeInTheDocument();
  });

  it("applies a dark background color to the main container", () => {
    const { container } = render(<SignInPage />);
    const main = container.querySelector("main") as HTMLElement;
    // jsdom normalises hex colours to their rgb() equivalent
    expect(main.style.backgroundColor).toBe("rgb(9, 9, 11)");
  });

  it("centres the sign-in widget using flex layout", () => {
    const { container } = render(<SignInPage />);
    const main = container.querySelector("main") as HTMLElement;
    expect(main.style.display).toBe("flex");
    expect(main.style.alignItems).toBe("center");
    expect(main.style.justifyContent).toBe("center");
  });

  it("main container has minHeight of 100vh", () => {
    const { container } = render(<SignInPage />);
    const main = container.querySelector("main") as HTMLElement;
    expect(main.style.minHeight).toBe("100vh");
  });
});