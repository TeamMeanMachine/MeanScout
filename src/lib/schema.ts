import z from "zod";

// General schemas

export const valueSchema = z.union([z.string(), z.number(), z.boolean()]);
export type Value = z.infer<typeof valueSchema>;

// Meta DB schemas

const event = z.object({
  id: z.string(),
  name: z.string(),
  tbaEventKey: z.string().optional(),
  modifiedAt: z.number(),
});

const metaTeam = z.object({
  id: z.string(),
  name: z.string(),
});

export const metaDBSchema = { event, team: metaTeam };

export namespace MetaDB {
  export type Event = z.infer<typeof event>;
  export type Team = z.infer<typeof metaTeam>;
}

// Control schemas

const controlBase = z.object({
  label: z.string(),
  variable: z.string(),
  tip: z.string().optional(),
});

const controlToggle = z.object({
  ...controlBase.shape,
  type: z.literal("toggle"),
  default: z.boolean().optional(),
  points: z.number().optional(),
});

const controlNumber = z.object({
  ...controlBase.shape,
  type: z.literal("number"),
  allowNegative: z.boolean().optional(),
  multiples: z.number().array().optional(),
  default: z.number().optional(),
  points: z.number().optional(),
});

const controlSelect = z.object({
  ...controlBase.shape,
  type: z.literal("select"),
  options: z.string().array(),
  radio: z.boolean().optional(),
  default: z.string().optional(),
  points: z.record(z.string(), z.number()).optional(),
});

const controlText = z.object({
  ...controlBase.shape,
  type: z.literal("text"),
  long: z.boolean().optional(),
});

const controlRating = z.object({
  ...controlBase.shape,
  type: z.literal("rating"),
});

const controlTimer = z.object({
  ...controlBase.shape,
  type: z.literal("timer"),
});

const controlSingle = z.union([controlToggle, controlNumber, controlSelect, controlText, controlRating, controlTimer]);

const controlGroup = z.object({
  label: z.string(),
  type: z.literal("group"),
  fields: controlSingle.array(),
});

const controlAny = z.union([...controlSingle.options, controlGroup]);

export const controlSchema = {
  toggle: controlToggle,
  number: controlNumber,
  select: controlSelect,
  text: controlText,
  rating: controlRating,
  timer: controlTimer,
  single: controlSingle,
  group: controlGroup,
  any: controlAny,
};

export namespace Control {
  export type Toggle = z.infer<typeof controlToggle>;
  export type Number = z.infer<typeof controlNumber>;
  export type Select = z.infer<typeof controlSelect>;
  export type Text = z.infer<typeof controlText>;
  export type Rating = z.infer<typeof controlRating>;
  export type Timer = z.infer<typeof controlTimer>;
  export type Single = z.infer<typeof controlSingle>;
  export type Group = z.infer<typeof controlGroup>;
  export type Any = z.infer<typeof controlAny>;
}

// For picklists/expressions

const reduceMethodSchema = z.union([
  z.object({ type: z.literal(["sum", "max", "median", "and", "or"]) }),
  z.object({ type: z.literal(["mean", "min", "mode", "range"]), ignoreZero: z.boolean().optional() }),
  z.object({ type: z.literal("count"), value: valueSchema }),
  z.object({ type: z.literal("stddev"), sample: z.boolean().optional() }),
]);

const mapMethodSchema = z.union([
  z.object({ type: z.literal(["add", "sub", "mult", "div"]), value: z.number() }),
  z.object({ type: z.literal(["negate", "abs"]) }),
  z.object({
    type: z.literal("convert"),
    converters: z.array(z.object({ from: valueSchema, to: valueSchema })),
    default: valueSchema.optional(),
  }),
]);

const methodSchema = z.union([...reduceMethodSchema.options, ...mapMethodSchema.options]);

const literalInput = z.object({ type: z.literal("literal"), value: valueSchema });

const inputSchema = z.union([
  z.object({
    type: z.literal("variable"),
    formId: z.string(),
    variable: z.string(),
    fallback: valueSchema.optional(),
    aggregate: reduceMethodSchema.optional(),
  }),
  z.object({
    type: z.literal("expression"),
    id: z.string(),
    fallback: valueSchema.optional(),
    aggregate: z.union([z.boolean(), reduceMethodSchema]).optional(),
  }),
  z.object({
    type: z.literal("inline"),
    get inputs() {
      return z.array(inputSchema.or(literalInput));
    },
    method: methodSchema,
    fallback: valueSchema.optional(),
    aggregate: z.union([z.boolean(), reduceMethodSchema]).optional(),
  }),
]);

// Event DB schemas

const team = z.object({
  id: z.string(),
});

const match = z.object({
  id: z.string(),
  number: z.number(),
  set: z.number(),
  level: z.literal(["qm", "ef", "qf", "sf", "f"]),
  red: z.object({
    teams: z.string().array(),
    score: z.number().optional(),
    breakdown: z.record(z.string(), z.any()).optional(),
  }),
  blue: z.object({
    teams: z.string().array(),
    score: z.number().optional(),
    breakdown: z.record(z.string(), z.any()).optional(),
  }),
  pred: z
    .looseObject({
      winner: z.string(),
      redWinProb: z.number(),
      redScore: z.number(),
      blueScore: z.number(),
    })
    .optional(),
  startedAt: z.number().optional(),
});

const picklist = z.object({
  id: z.string(),
  name: z.string(),
  weights: z.array(inputSchema.and(z.object({ percentage: z.number() }))),
  teams: z.record(z.string(), z.object({ note: z.string(), rank: z.string(), omitted: z.boolean() }).partial()),
  createdBy: z.string(),
  createdByTeam: z.string(),
});

const expression = z.object({
  id: z.string(),
  name: z.string(),
  inputs: z.array(z.union([literalInput, ...inputSchema.options])),
  method: methodSchema,
  aggregate: reduceMethodSchema.optional(),
  createdBy: z.string(),
  createdByTeam: z.string(),
});

const form = z.object({
  id: z.string(),
  name: z.string(),
  type: z.literal(["match", "pit"]),
  controls: controlSchema.any.array(),
  createdBy: z.string(),
  createdByTeam: z.string(),
  modifiedAt: z.number(),
});

const entry = z.object({
  id: z.string(),
  formId: z.string(),
  status: z.literal(["draft", "submitted", "exported", "deleted"]),
  team: z.string(),
  matchId: z.string().optional(),
  absent: z.boolean().optional(),
  values: z.record(z.string(), z.any()),
  createdBy: z.string(),
  createdByTeam: z.string(),
  modifiedAt: z.number(),
});

const guess = z.object({
  id: z.string(),
  matchId: z.string(),
  choice: z.literal(["red", "blue"]),
  reason: z.string().optional(),
  createdBy: z.string(),
  createdByTeam: z.string(),
  madeAt: z.number(),
});

export const eventDBSchema = {
  team,
  match,
  picklist,
  expression,
  form,
  entry,
  guess,
};

export namespace EventDB {
  export type Team = z.infer<typeof team>;
  export type Match = z.infer<typeof match>;
  export type Picklist = z.infer<typeof picklist>;
  export type Expression = z.infer<typeof expression>;
  export type Form = z.infer<typeof form>;
  export type Entry = z.infer<typeof entry>;
  export type Guess = z.infer<typeof guess>;
}
