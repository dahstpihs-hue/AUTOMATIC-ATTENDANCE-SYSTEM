const supabase = require("../dbClient");

const MAP_MONGO_TO_PG = {
  _id: "id",
  markedBy: "marked_by",
  uploadedBy: "uploaded_by",
  enteredBy: "entered_by",
  rollNumber: "roll_number",
  parentName: "parent_name",
  parentPhone: "parent_phone",
  extraData: "extra_data",
  dueDate: "due_date",
  paidOn: "paid_on",
  paymentMode: "payment_mode",
  eventDate: "event_date",
  createdBy: "created_by",
  className: "class_name",
  timeSlot: "time_slot",
  startTime: "start_time",
  endTime: "end_time",
  fileName: "file_name",
  importedStudents: "imported_students",
  importedFaculty: "imported_faculty",
  loginId: "login_id"
};

const MAP_PG_TO_MONGO = {};
for (const key in MAP_MONGO_TO_PG) {
  MAP_PG_TO_MONGO[MAP_MONGO_TO_PG[key]] = key;
}

function mapKeys(obj, mapper) {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map((item) => mapKeys(item, mapper));
  const newObj = {};
  for (const key in obj) {
    const newKey = mapper[key] || key;
    let val = obj[key];
    if (val && typeof val === "object" && !(val instanceof Date)) {
      val = mapKeys(val, mapper);
    }
    newObj[newKey] = val;
  }
  return newObj;
}

function toPg(obj) {
  return mapKeys(obj, MAP_MONGO_TO_PG);
}

function toMongo(row) {
  if (!row) return row;
  if (Array.isArray(row)) return row.map(toMongo);
  const doc = mapKeys(row, MAP_PG_TO_MONGO);
  doc._id = doc.id;
  return doc;
}

function applyFilters(queryBuilder, mongoQuery, table) {
  if (!mongoQuery) return queryBuilder;

  // Special translation for Student/Teacher filters to handle complex nested $or & $and structure
  if (table === "students" || table === "teachers") {
    const checkSpecial = mongoQuery.$or || mongoQuery.$and || mongoQuery["extraData.SEMESTER"] || mongoQuery["extra_data.semester"];
    if (checkSpecial) {
      return translateStudentQuery(queryBuilder, mongoQuery);
    }
  }

  for (const key in mongoQuery) {
    if (key === "$or" && Array.isArray(mongoQuery[key])) {
      const orParts = mongoQuery[key].map((cond) => {
        const cKey = Object.keys(cond)[0];
        let cPgKey = MAP_MONGO_TO_PG[cKey] || cKey;
        cPgKey = cPgKey.replace("extra_data.", "extra_data->>").replace("extraData.", "extra_data->>");
        const cVal = cond[cKey];
        const cValStr = cVal instanceof RegExp ? cVal.source.replace(/^\^|\$$/g, "") : String(cVal);
        return `${cPgKey}.ilike.${cValStr}`;
      });
      queryBuilder = queryBuilder.or(orParts.join(","));
      continue;
    }

    let pgKey = MAP_MONGO_TO_PG[key] || key;
    pgKey = pgKey.replace("extra_data.", "extra_data->>").replace("extraData.", "extra_data->>");

    const val = mongoQuery[key];

    if (val && typeof val === "object" && !(val instanceof Date)) {
      const ops = Object.keys(val);
      for (const op of ops) {
        if (op === "$gte") {
          queryBuilder = queryBuilder.gte(pgKey, val[op]);
        } else if (op === "$lte") {
          queryBuilder = queryBuilder.lte(pgKey, val[op]);
        } else if (op === "$gt") {
          queryBuilder = queryBuilder.gt(pgKey, val[op]);
        } else if (op === "$lt") {
          queryBuilder = queryBuilder.lt(pgKey, val[op]);
        } else if (op === "$in") {
          queryBuilder = queryBuilder.in(pgKey, val[op]);
        } else if (op === "$ne") {
          queryBuilder = queryBuilder.neq(pgKey, val[op]);
        }
      }
    } else {
      queryBuilder = queryBuilder.eq(pgKey, val);
    }
  }

  return queryBuilder;
}

function translateStudentQuery(queryBuilder, q) {
  let semesterVal = q["extraData.SEMESTER"] || q["extra_data.semester"] || q["extraData.semester"];
  if (semesterVal) {
    const cleanSem = semesterVal instanceof RegExp ? semesterVal.source.replace(/^\^|\$$/g, "") : String(semesterVal);
    queryBuilder = queryBuilder.ilike("extra_data->>SEMESTER", cleanSem);
  }

  const getVal = (v) => (v instanceof RegExp ? v.source.replace(/^\^|\$$/g, "") : String(v));

  if (q.$and && Array.isArray(q.$and)) {
    const disciplineOr = q.$and[0]?.$or;
    const batchOr = q.$and[1]?.$or;

    if (disciplineOr) {
      const val1 = getVal(disciplineOr[0]["extraData.DISCIPLINE"] || disciplineOr[0]["extra_data.DISCIPLINE"] || disciplineOr[1]?.class);
      queryBuilder = queryBuilder.or(`class.ilike.${val1},extra_data->>DISCIPLINE.ilike.${val1}`);
    }
    if (batchOr) {
      const val2 = getVal(batchOr[0]["extraData.BATCH"] || batchOr[0]["extra_data.BATCH"] || batchOr[1]?.class);
      queryBuilder = queryBuilder.or(`section.ilike.${val2},extra_data->>BATCH.ilike.${val2}`);
    }
  } else if (q.$or && Array.isArray(q.$or)) {
    const checkBatch = q.$or.some((c) => c["extraData.BATCH"] || c["extra_data.BATCH"] || c.section);
    if (checkBatch) {
      const val = getVal(q.$or[0]["extraData.BATCH"] || q.$or[0]["extra_data.BATCH"] || q.$or[1]?.section);
      queryBuilder = queryBuilder.or(`section.ilike.${val},extra_data->>BATCH.ilike.${val}`);
    } else {
      const val = getVal(q.$or[0]["extraData.DISCIPLINE"] || q.$or[0]["extra_data.DISCIPLINE"] || q.$or[1]?.class);
      queryBuilder = queryBuilder.or(`class.ilike.${val},extra_data->>DISCIPLINE.ilike.${val}`);
    }
  }

  return queryBuilder;
}

function buildSelect(fields, populates) {
  let selectStr = fields || "*";
  if (populates && populates.length > 0) {
    const parts = [selectStr];
    populates.forEach((p) => {
      const pgRelation = MAP_MONGO_TO_PG[p.path] || p.path;
      let pgTable = pgRelation;
      if (
        pgRelation === "user" ||
        pgRelation === "marked_by" ||
        pgRelation === "uploaded_by" ||
        pgRelation === "entered_by"
      ) {
        pgTable = "users";
      } else if (pgRelation === "student") {
        pgTable = "students";
      } else if (pgRelation === "teacher") {
        pgTable = "teachers";
      }

      let subFields = "*";
      if (p.fields) {
        const splitFields = p.fields.split(/\s+/).filter(Boolean);
        const pgSubFields = splitFields.map((f) => MAP_MONGO_TO_PG[f] || f);
        if (!pgSubFields.includes("id")) pgSubFields.push("id");
        subFields = pgSubFields.join(",");
      }
      parts.push(`${pgRelation}:${pgTable}(${subFields})`);
    });
    selectStr = parts.join(",");
  }
  return selectStr;
}

class SupabaseQuery {
  constructor(table, method, args = []) {
    this.table = table;
    this.method = method;
    this.args = args;
    this.sortFields = null;
    this.populates = [];
    this.fields = "*";
    this.limitVal = null;
    this.isLean = false;
  }

  sort(fields) {
    this.sortFields = fields;
    return this;
  }

  populate(path, fields) {
    this.populates.push({ path, fields });
    return this;
  }

  select(fields) {
    // If it's a select field list like "name email"
    if (typeof fields === "string") {
      this.fields = fields
        .split(/\s+/)
        .filter(Boolean)
        .map((f) => MAP_MONGO_TO_PG[f] || f)
        .join(",");
    }
    return this;
  }

  limit(n) {
    this.limitVal = n;
    return this;
  }

  lean() {
    this.isLean = true;
    return this;
  }

  async exec() {
    let selectStr = buildSelect(this.fields, this.populates);
    let qb = supabase.from(this.table).select(selectStr);

    if (this.method === "findById") {
      qb = qb.eq("id", this.args[0]).maybeSingle();
    } else if (this.method === "findOne") {
      qb = applyFilters(qb, this.args[0], this.table).limit(1).maybeSingle();
    } else if (this.method === "find") {
      qb = applyFilters(qb, this.args[0], this.table);
    }

    if (this.sortFields) {
      for (const key in this.sortFields) {
        const pgKey = MAP_MONGO_TO_PG[key] || key;
        qb = qb.order(pgKey, { ascending: this.sortFields[key] > 0 });
      }
    }

    if (this.limitVal) {
      qb = qb.limit(this.limitVal);
    }

    const { data, error } = await qb;
    if (error) throw new Error(error.message);

    return toMongo(data);
  }

  then(onFulfilled, onRejected) {
    return this.exec().then(onFulfilled, onRejected);
  }
}

function makeModel(tableName) {
  return {
    find(q) {
      return new SupabaseQuery(tableName, "find", [q]);
    },
    findOne(q) {
      return new SupabaseQuery(tableName, "findOne", [q]);
    },
    findById(id) {
      return new SupabaseQuery(tableName, "findById", [id]);
    },
    async create(doc) {
      const dataToInsert = Array.isArray(doc) ? doc.map(toPg) : toPg(doc);
      const { data, error } = await supabase.from(tableName).insert(dataToInsert).select();
      if (error) throw new Error(error.message);
      return toMongo(Array.isArray(doc) ? data : data[0]);
    },
    async insertMany(docs) {
      const dataToInsert = docs.map(toPg);
      const { data, error } = await supabase.from(tableName).insert(dataToInsert).select();
      if (error) throw new Error(error.message);
      return toMongo(data);
    },
    async findByIdAndUpdate(id, update, options = {}) {
      // Mongoose update might contain direct fields, or $set
      let finalUpdate = update;
      if (update && update.$set) {
        finalUpdate = { ...update, ...update.$set };
        delete finalUpdate.$set;
      }
      const pgUpdate = toPg(finalUpdate);
      const { data, error } = await supabase
        .from(tableName)
        .update(pgUpdate)
        .eq("id", id)
        .select()
        .maybeSingle();
      if (error) throw new Error(error.message);
      return toMongo(data);
    },
    async findOneAndUpdate(filter, update, options = {}) {
      // Find the record first to respect MongoDB findOneAndUpdate
      let qb = supabase.from(tableName).select("id");
      qb = applyFilters(qb, filter, tableName).limit(1).maybeSingle();
      const { data: existing } = await qb;

      let finalUpdate = update;
      if (update && update.$set) {
        finalUpdate = { ...update, ...update.$set };
        delete finalUpdate.$set;
      }
      const pgUpdate = toPg(finalUpdate);

      if (existing) {
        const { data, error } = await supabase
          .from(tableName)
          .update(pgUpdate)
          .eq("id", existing.id)
          .select()
          .maybeSingle();
        if (error) throw new Error(error.message);
        return toMongo(data);
      } else if (options.upsert) {
        // Insert new record combining filter and update values
        const combined = { ...filter, ...finalUpdate };
        // Remove operators like $gte
        for (const k in combined) {
          if (combined[k] && typeof combined[k] === "object" && !(combined[k] instanceof Date)) {
            delete combined[k];
          }
        }
        const pgCombined = toPg(combined);
        const { data, error } = await supabase.from(tableName).insert(pgCombined).select().maybeSingle();
        if (error) throw new Error(error.message);
        return toMongo(data);
      }
      return null;
    },
    async findByIdAndDelete(id) {
      const { data, error } = await supabase.from(tableName).delete().eq("id", id).select().maybeSingle();
      if (error) throw new Error(error.message);
      return toMongo(data);
    },
    async deleteOne(q) {
      let qb = supabase.from(tableName).select("id");
      qb = applyFilters(qb, q, tableName).limit(1).maybeSingle();
      const { data: existing } = await qb;

      if (existing) {
        const { error } = await supabase.from(tableName).delete().eq("id", existing.id);
        if (error) throw new Error(error.message);
        return { deletedCount: 1 };
      }
      return { deletedCount: 0 };
    },
    async deleteMany(q) {
      let qb = supabase.from(tableName).delete();
      qb = applyFilters(qb, q, tableName);
      const { error, count } = await qb;
      if (error) throw new Error(error.message);
      return { deletedCount: count || 0 };
    },
    async countDocuments(q) {
      let qb = supabase.from(tableName).select("*", { count: "exact", head: true });
      qb = applyFilters(qb, q, tableName);
      const { error, count } = await qb;
      if (error) throw new Error(error.message);
      return count || 0;
    },
    async aggregate(pipeline) {
      // Determine what views to query
      // 1. Lectures stats
      const isLectures = pipeline.some(
        (stage) => stage.$group && stage.$group.totalStudents
      );
      if (isLectures) {
        // Retrieve lectures view
        let qb = supabase.from("lectures_view").select("*");
        const matchStage = pipeline.find((stage) => stage.$match);
        if (matchStage && matchStage.$match) {
          qb = applyFilters(qb, matchStage.$match, "lectures_view");
        }
        qb = qb.order("date", { ascending: false });
        const { data, error } = await qb;
        if (error) throw new Error(error.message);
        return toMongo(data);
      }

      // 2. Defaulters stats
      const isDefaulters = pipeline.some(
        (stage) => stage.$lookup && stage.$lookup.from === "students"
      );
      if (isDefaulters) {
        let qb = supabase.from("defaulters_view").select("*, student:students(*)");
        // Defaulter logic is executed in database view, filter by percentage in match stage if needed
        const matchStage = pipeline.find((stage) => stage.$match && stage.$match.percentage);
        if (matchStage && matchStage.$match && matchStage.$match.percentage) {
          const thresholdVal = matchStage.$match.percentage.$lt;
          if (thresholdVal !== undefined) {
            qb = qb.lt("percentage", thresholdVal);
          }
        }
        const { data, error } = await qb;
        if (error) throw new Error(error.message);
        return toMongo(data);
      }

      throw new Error("Custom aggregations are not fully implemented inside dbAdapter. Use SQL views.");
    }
  };
}

module.exports = {
  makeModel,
  toPg,
  toMongo
};
