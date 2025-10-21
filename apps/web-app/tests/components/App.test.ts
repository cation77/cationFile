import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import App from '../src/App.vue'

describe('App.vue', () => {
  it('renders navigation', () => {
    const wrapper = mount(App)
    expect(wrapper.find('.navbar').exists()).toBe(true)
    expect(wrapper.find('.nav-brand').exists()).toBe(true)
  })

  it('has correct navigation links', () => {
    const wrapper = mount(App)
    const links = wrapper.findAll('.nav-link')
    expect(links).toHaveLength(3)
    expect(links[0].text()).toBe('首页')
    expect(links[1].text()).toBe('关于')
    expect(links[2].text()).toBe('API测试')
  })
})
