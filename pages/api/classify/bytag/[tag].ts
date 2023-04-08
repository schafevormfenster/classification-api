import type { NextApiRequest, NextApiResponse } from "next";
import {
  RuralEventCategory,
  RuralEventCategoryId,
} from "../../../../packages/rural-event-categories/src/types/ruralEventCategory.types";
import { classifyByTag } from "../../../../src/classification/tags/classifyByTag";
import { ruralEventCategories } from "../../../../packages/rural-event-categories/src/types/ruralEventCategory";
import { HttpErrorBody } from "../../../../src/errors/error.types";

// define response type
export type ClassificationResponse = RuralEventCategory | HttpErrorBody | null;

/**
 * @swagger
 * /api/classify/bytag/{tag}:
 *   get:
 *     summary: Returns a category for a given tag.
 *     description: Evaluates a tag based on some mapping definitions and returns a category.
 *     tags:
 *       - Classify
 *     parameters:
 *       - name: tag
 *         description: A tag as string.
 *         in: path
 *         required: true
 *         type: string
 *     produces:
 *       - application/json
 *     responses:
 *       200:
 *         description: Category for the given tag.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ClassificationResponse>
) {
  const { tag } = req.query;

  if (!tag)
    return res.status(400).end({
      status: 400,
      message: "Missing tag parameter. Please provide a tag as string.",
    });

  // classify by tags
  let categoryByTag: RuralEventCategoryId | null = null;
  try {
    categoryByTag = await classifyByTag(tag as string);
  } catch (error) {
    // handle error as 404
    console.error(error);
  }

  if (!categoryByTag) {
    const message: string = `no category found for tag "${tag}"`;
    console.debug(message);
    return res.status(404).json({ status: 404, message: message });
  }

  console.debug(`category "${categoryByTag}" found for tag "${tag}"`);
  const fullCategory: RuralEventCategory = ruralEventCategories.find(
    (category) => category.id === categoryByTag
  ) as RuralEventCategory;

  // add cache header to allow cdn caching of responses
  const cacheMaxAge: string = process.env.CACHE_MAX_AGE || "604800"; // 7 days
  const cacheStaleWhileRevalidate: string =
    process.env.CACHE_STALE_WHILE_REVALIDATE || "120"; // 2 minutes
  res.setHeader(
    "Cache-Control",
    `max-age=${cacheMaxAge}, s-maxage=${cacheMaxAge}, stale-while-revalidate=${cacheStaleWhileRevalidate}`
  );

  return res.status(200).json(fullCategory);
}
