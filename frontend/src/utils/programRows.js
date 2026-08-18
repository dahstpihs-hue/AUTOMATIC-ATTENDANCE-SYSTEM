const programClasses = [
  {
    className: "program-row--radiology",
    words: ["radiology", "radiolgoy", "radio"],
  },
  {
    className: "program-row--mlt",
    words: ["mlt", "medical laboratory", "medical lab"],
  },
  {
    className: "program-row--dental",
    words: ["dental", "dentistry"],
  },
  {
    className: "program-row--anaesthesia",
    words: ["anaesthesia", "anesthesia", "anaestheisa", "anasthesia"],
  },
  {
    className: "program-row--social-sciences",
    words: ["social sciences", "social science"],
  },
  {
    className: "program-row--pharmacy",
    words: ["pharmacy", "pharmcy", "pharma"],
  },
  {
    className: "program-row--mbbs",
    words: ["mbbs"],
  },
];

export function programRowClass(values = []) {
  const text = values.join(" ").toLowerCase();
  const match = programClasses.find((program) =>
    program.words.some((word) => text.includes(word))
  );
  return match?.className || "";
}

