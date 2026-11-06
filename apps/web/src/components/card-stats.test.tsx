import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { CardStats } from "./card-stats";

test("能力値は剣・盾と数値で表示し、名前は読み上げ専用にする", () => {
  const html = renderToStaticMarkup(<CardStats attack={12345.67} defense={0} element="person" />);
  expect(html).toContain("lucide-swords");
  expect(html).toContain("lucide-shield");
  expect(html).toContain("12,345.67");
  expect(html).toContain('class="sr-only">攻撃 ');
  expect(html).toContain('class="sr-only">防御 ');
  expect(html.replace(/<span class="sr-only">.*?<\/span>/g, "")).not.toMatch(/攻撃|防御/);
  expect(html).not.toContain("未計測");
});

test("未計測と大きな数値も表示できる", () => {
  const html = renderToStaticMarkup(
    <CardStats prominent attack={123456789} defense={null} element="general" />,
  );
  expect(html).toContain("123,456,789");
  expect(html).toContain("未計測");
  expect(html).toContain("h-5 w-5");
});
