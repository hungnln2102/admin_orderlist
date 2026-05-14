import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App';
import { createElement } from 'react';

describe('App', () => {
  it('renders without crashing', () => {
    const { container } = render(createElement(App));
    expect(container).toBeInTheDocument();
  });
});
