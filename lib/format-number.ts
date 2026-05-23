/** Форматирование чисел без гидратационных расхождений SSR/клиент. */
export function formatNumberRu(value: number): string {
  return new Intl.NumberFormat("ru-RU").format(value)
}
