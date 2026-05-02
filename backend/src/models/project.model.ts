import mongoose, { Schema, Document } from "mongoose";

export interface IProject extends Document {
  title: string;
  ownerId: string;
  collaborators: string[];
  content: string;
  lastModified: Date;
  metadata: {
    institution?: string;
    style?: "IEEE" | "APA" | "ACM";
    abstract?: string;
  };
}

const ProjectSchema: Schema = new Schema({
  title: { type: String, required: true },
  ownerId: { type: String, required: true },
  collaborators: [{ type: String }],
  content: { type: String, default: "" },
  lastModified: { type: Date, default: Date.now },
  metadata: {
    institution: { type: String },
    style: { type: String, enum: ["IEEE", "APA", "ACM"], default: "IEEE" },
    abstract: { type: String },
  },
});

export const Project = mongoose.model<IProject>("Project", ProjectSchema);
