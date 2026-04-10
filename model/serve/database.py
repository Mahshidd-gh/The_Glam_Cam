import psycopg2
import random


def get_connection():
    return psycopg2.connect(
        host="localhost",
        database="smart_mirror",
        user="mahshidsmac",
        password="",
    )


def fetch_tutorial(
    face_shape,
    makeup_style=None,
    hair_style=None,
    occasion=None,
    skill_level=None,
    random_choice=True,
):
    conn = get_connection()
    cursor = conn.cursor()

    query = """
        SELECT face_shape, makeup_style, hair_style, occasion, skill_level, tutorial
        FROM makeup_tutorials
        WHERE LOWER(face_shape) = LOWER(%s)
    """
    params = [face_shape]

    if makeup_style:
        query += " AND LOWER(makeup_style) = LOWER(%s)"
        params.append(makeup_style)

    if hair_style:
        query += " AND LOWER(hair_style) = LOWER(%s)"
        params.append(hair_style)

    if occasion:
        query += " AND LOWER(occasion) = LOWER(%s)"
        params.append(occasion)

    if skill_level:
        query += " AND LOWER(skill_level) = LOWER(%s)"
        params.append(skill_level)


    if random_choice:
        query += " ORDER BY RANDOM() LIMIT 1"

    print(query, params)

    cursor.execute(query, tuple(params))
    result = cursor.fetchone()
    conn.close()

    if result:
        face_shape_val, makeup_style_val, hair_style_val, occasion_val, skill_level_val, tutorial_text = result
        steps = [s.strip() + "." for s in tutorial_text.split(". ") if s.strip()]
        steps = [s[:-1] if s.endswith("..") else s for s in steps]
        return {
            "face_shape": face_shape_val,
            "makeup_style": makeup_style_val,
            "hair_style": hair_style_val,
            "occasion": occasion_val,
            "skill_level": skill_level_val,
            "steps": steps,
            "total_steps": len(steps),
        }
    else:
        return None

        