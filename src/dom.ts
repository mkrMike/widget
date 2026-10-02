export type Child = Node | string | null

/**
 * Creates an element with properties (not attributes) and children. Text goes
 * through text nodes, never innerHTML.
 */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Partial<Omit<HTMLElementTagNameMap[K], 'style'>> = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag)
  Object.assign(element, props)
  element.append(...children.filter((child) => child !== null))
  return element
}
