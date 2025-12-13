import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Section from './Section';

describe('Section', () => {
  it('renders the title, icon, and children', () => {
    const title = 'Test Section';
    const childText = 'This is the child content.';
    const icon = <div data-testid="test-icon">ICON</div>;

    render(
      <Section title={title} icon={icon}>
        <p>{childText}</p>
      </Section>
    );

    // Check for the title
    expect(screen.getByText(title)).toBeInTheDocument();

    // Check for the icon
    expect(screen.getByTestId('test-icon')).toBeInTheDocument();

    // Check for the children
    expect(screen.getByText(childText)).toBeInTheDocument();
  });
});
