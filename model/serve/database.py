import psycopg2
import random


def get_connection():
    return psycopg2.connect(
        host="localhost",
        database="smart_mirror",
        user="mahshidsmac",
        password=""
    )


def fetch_tutorial(face_shape, makeup_style=None, hair_style=None, random_choice=True):

    conn = get_connection()
    cursor = conn.cursor()

    query = """
        SELECT tutorial
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

    if random_choice:
        query += " ORDER BY RANDOM() LIMIT 1"

    cursor.execute(query, tuple(params))
    result = cursor.fetchone()

    conn.close()

    if result:
        tutorial_text = result[0]
        steps = tutorial_text.split("\n")
        return steps
    else:
        return None