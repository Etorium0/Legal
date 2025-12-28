"""
  Copyright (C) 2023 tghuy

  This file is part of VN-Law-Advisor.

  VN-Law-Advisor is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  VN-Law-Advisor is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with VN-Law-Advisor.  If not, see <http://www.gnu.org/licenses/>.
"""

import os

from peewee import MySQLDatabase


# Allow overriding connection via env for host-based runs
MYSQL_DB = os.getenv("MYSQL_DB", "law")
MYSQL_USER = os.getenv("MYSQL_USER", "root")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "123456789")
MYSQL_HOST = os.getenv("MYSQL_HOST", "localhost")
MYSQL_PORT = int(os.getenv("MYSQL_PORT", "3307"))

db = MySQLDatabase(
  database=MYSQL_DB,
  user=MYSQL_USER,
  password=MYSQL_PASSWORD,
  host=MYSQL_HOST,
  port=MYSQL_PORT,
  charset="utf8mb4",
)

