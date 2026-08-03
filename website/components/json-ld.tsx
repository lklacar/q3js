type JsonLdValue = Record<string, unknown> | ReadonlyArray<Record<string, unknown>>;

function serializedJsonLd(data: JsonLdValue): string {
  return JSON.stringify(data).replaceAll("<", "\\u003c");
}

export function JsonLd({ data }: Readonly<{ data: JsonLdValue }>) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializedJsonLd(data) }}
    />
  );
}
