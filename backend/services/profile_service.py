import asyncpg

async def get_full_profile(user_id: str, conn: asyncpg.Connection) -> dict | None:
    row = await conn.fetchrow(
        """
        SELECT
            user_id, email, full_name, profile_summary,
            identified_skills, career_interests, preferred_clusters,
            session_count, created_at, last_active
        FROM user_profiles
        WHERE user_id = $1
        """,
        user_id
    )
    if not row:
        return None
    return dict(row)

async def ensure_user_exists(user_id: str, email: str, full_name: str, conn: asyncpg.Connection):
    await conn.execute(
        """
        INSERT INTO user_profiles (user_id, email, full_name, session_count)
        VALUES ($1, $2, $3, 0)
        ON CONFLICT (user_id) DO NOTHING
        """,
        user_id, email, full_name
    )
