import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import Home from '../../src/views/Home.vue';

describe('Home.vue', () => {
  it('renders properly', () => {
    const wrapper = mount(Home);
    expect(wrapper.text()).toContain('欢迎使用 Vue3 Monorepo 应用');
  });

  it('displays technology stack', () => {
    const wrapper = mount(Home);
    expect(wrapper.text()).toContain('Vue 3');
    expect(wrapper.text()).toContain('TypeScript');
    expect(wrapper.text()).toContain('Vite');
  });
});
