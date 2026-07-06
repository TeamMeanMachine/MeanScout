import z from "zod";

export const value = z.union([z.string(), z.number(), z.boolean()]);
export type Value = z.infer<typeof value>;

export namespace Control {
  const base = z.object({
    label: z.string(),
    variable: z.string(),
    tip: z.string().optional(),
  });

  export const toggle = z.object({
    ...base.shape,
    type: z.literal("toggle"),
    default: z.boolean().optional(),
  });

  export const number = z.object({
    ...base.shape,
    type: z.literal("number"),
    allowNegative: z.boolean().optional(),
    multiples: z.number().array().optional(),
    default: z.number().optional(),
  });

  export const select = z.object({
    ...base.shape,
    type: z.literal("select"),
    options: z.string().array(),
    radio: z.boolean().optional(),
    default: z.string().optional(),
  });

  export const text = z.object({
    ...base.shape,
    type: z.literal("text"),
    long: z.boolean().optional(),
  });

  export const rating = z.object({
    ...base.shape,
    type: z.literal("rating"),
  });

  export const timer = z.object({
    ...base.shape,
    type: z.literal("timer"),
  });

  export const single = z.union([toggle, number, select, text, rating, timer]);

  export const group = z.object({
    label: z.string(),
    type: z.literal("group"),
    fields: single.array(),
  });

  export const any = z.union([...single.options, group]);

  export type Toggle = z.infer<typeof toggle>;
  export type Number = z.infer<typeof number>;
  export type Select = z.infer<typeof select>;
  export type Text = z.infer<typeof text>;
  export type Rating = z.infer<typeof rating>;
  export type Timer = z.infer<typeof timer>;
  export type Single = z.infer<typeof single>;
  export type Group = z.infer<typeof group>;
  export type Any = z.infer<typeof any>;
}

export namespace Method {
  export const reducer = z.union([
    z.object({ type: z.literal(["sum", "max", "median", "and", "or"]) }),
    z.object({ type: z.literal(["mean", "min", "mode", "range"]), ignoreZero: z.boolean().optional() }),
    z.object({ type: z.literal("count"), value }),
    z.object({ type: z.literal("stddev"), sample: z.boolean().optional() }),
  ]);

  export const mapper = z.union([
    z.object({
      type: z.literal(["add", "sub", "mult", "div", "gt", "gte", "lt", "lte", "eq", "neq"]),
      get value() {
        return Input.any;
      },
    }),
    z.object({ type: z.literal(["negate", "abs"]) }),
    z.object({
      type: z.literal("convert"),
      converters: z.object({ from: value, to: value }).array(),
      get default() {
        return Input.any;
      },
    }),
  ]);

  export const any = z.union([...reducer.options, ...mapper.options]);

  export type Reducer = z.infer<typeof reducer>;
  export type Mapper = z.infer<typeof mapper>;
  export type Any = z.infer<typeof any>;
}

export namespace Input {
  export const literal = z.object({
    type: z.literal("literal"),
    value,
  });

  export const variable = z.object({
    type: z.literal("variable"),
    formId: z.string(),
    variable: z.string(),
    fallback: value.optional(),
    aggregate: Method.reducer.optional(),
  });

  export const score = z.object({
    type: z.literal("score"),
    metric: z.string(),
    allianceWide: z.boolean().optional(),
    fallback: value.optional(),
    aggregate: Method.reducer.optional(),
  });

  export const expression = z.object({
    type: z.literal("expression"),
    id: z.string(),
    fallback: value.optional(),
    aggregate: z.union([z.boolean(), Method.reducer]).optional(),
  });

  export const inline = z.object({
    type: z.literal("inline"),
    get inputs() {
      return any.array();
    },
    method: Method.any,
    fallback: value.optional(),
    aggregate: Method.reducer.optional(),
  });

  export const stat = z.object({
    type: z.literal(["rank", "stat", "opr", "epa"]),
    metric: z.string(),
    fallback: value.optional(),
  });

  export const weight = z.union([variable, score, expression, inline, stat]).and(z.object({ percentage: z.number() }));

  export const any = z.union([literal, variable, score, expression, inline, stat]);

  export type Literal = z.infer<typeof literal>;
  export type Variable = z.infer<typeof variable>;
  export type Score = z.infer<typeof score>;
  export type Expression = z.infer<typeof expression>;
  export type Inline = z.infer<typeof inline>;
  export type Stat = z.infer<typeof stat>;
  export type Weight = z.infer<typeof weight>;
  export type Any = z.infer<typeof any>;
}
