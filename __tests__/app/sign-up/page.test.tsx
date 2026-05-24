import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// vi.hoisted ensures these are available inside the vi.mock factory (which is hoisted)
const { SignUpMock } = vi.hoisted(() => {
  const SignUpMock = vi.fn((props: Record<string, unknown>) => (
    <div data-testid="clerk-sign-up" data-redirect={props.forceRedirectUrl as string} />
  ));
  return { SignUpMock };
});

vi.mock("@clerk/nextjs", () => ({
  SignUp: SignUpMock,
}));

import SignUpPage from "@/app/sign-up/[[...sign-up]]/page";

describe("SignUpPage", () => {
  it("renders without crashing", () => {
    render(<SignUpPage />);
    expect(screen.getByTestId("clerk-sign-up")).toBeInTheDocument();
  });

  it("passes forceRedirectUrl='/' to the SignUp component", () => {
    render(<SignUpPage />);
    expect(SignUpMock).toHaveBeenCalled();
    const receivedProps = SignUpMock.mock.calls[0][0];
    expect(receivedProps.forceRedirectUrl).toBe("/");
  });

  it("renders a <main> element as the root container", () => {
    const { container } = render(<SignUpPage />);
    expect(container.querySelector("main")).toBeInTheDocument();
  });

  it("applies a dark background color to the main container", () => {
    const { container } = render(<SignUpPage />);
    const main = container.querySelector("main") as HTMLElement;
    // jsdom normalises hex colours to their rgb() equivalent
    expect(main.style.backgroundColor).toBe("rgb(9, 9, 11)");
  });

  it("centres the sign-up widget using flex layout", () => {
    const { container } = render(<SignUpPage />);
    const main = container.querySelector("main") as HTMLElement;
    expect(main.style.display).toBe("flex");
    expect(main.style.alignItems).toBe("center");
    expect(main.style.justifyContent).toBe("center");
  });

  it("main container has minHeight of 100vh", () => {
    const { container } = render(<SignUpPage />);
    const main = container.querySelector("main") as HTMLElement;
    expect(main.style.minHeight).toBe("100vh");
  });
});