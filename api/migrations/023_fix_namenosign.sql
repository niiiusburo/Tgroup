-- Fix existing namenosign values to be accent-insensitive
-- Uses a simple unaccent approach with regex for Vietnamese characters

UPDATE dbo.products
SET namenosign = LOWER(
  REGEXP_REPLACE(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        REGEXP_REPLACE(
          REGEXP_REPLACE(
            REGEXP_REPLACE(
              REGEXP_REPLACE(
                REGEXP_REPLACE(
                  REGEXP_REPLACE(
                    REGEXP_REPLACE(
                      REGEXP_REPLACE(
                        REGEXP_REPLACE(
                          REGEXP_REPLACE(
                            REGEXP_REPLACE(
                              REGEXP_REPLACE(
                                REGEXP_REPLACE(
                                  REGEXP_REPLACE(
                                    REGEXP_REPLACE(
                                      REGEXP_REPLACE(
                                        REGEXP_REPLACE(
                                          REGEXP_REPLACE(
                                            REGEXP_REPLACE(
                                              REGEXP_REPLACE(
                                                REGEXP_REPLACE(
                                                  REGEXP_REPLACE(
                                                    REGEXP_REPLACE(
                                                      REGEXP_REPLACE(
                                                        REGEXP_REPLACE(
                                                          REGEXP_REPLACE(
                                                            REGEXP_REPLACE(
                                                              REGEXP_REPLACE(
                                                                REGEXP_REPLACE(
                                                                  REGEXP_REPLACE(
                                                                    REGEXP_REPLACE(
                                                                      REGEXP_REPLACE(
                                                                        REGEXP_REPLACE(
                                                                          REGEXP_REPLACE(
                                                                            REGEXP_REPLACE(
                                                                              REGEXP_REPLACE(name,
                                                                              'à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ', 'a'),
                                                                              'è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ', 'e'),
                                                                              'ì|í|ị|ỉ|ĩ', 'i'),
                                                                              'ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ', 'o'),
                                                                              'ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ', 'u'),
                                                                              'ỳ|ý|ỵ|ỷ|ỹ', 'y'),
                                                                              'đ', 'd'),
                                                                              'À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ', 'A'),
                                                                              'È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ', 'E'),
                                                                              'Ì|Í|Ị|Ỉ|Ĩ', 'I'),
                                                                              'Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ', 'O'),
                                                                              'Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ', 'U'),
                                                                              'Ỳ|Ý|Ỵ|Ỷ|Ỹ', 'Y'),
                                                                              'Đ', 'D')
                                                                          )
                                                                        )
                                                                      )
                                                                    )
                                                                  )
                                                                )
                                                              )
                                                            )
                                                          )
                                                        )
                                                      )
                                                    )
                                                  )
                                                )
                                              )
                                            )
                                          )
                                        )
                                      )
                                    )
                                  )
                                )
                              )
                            )
                          )
                        )
                      )
                    )
                  )
                )
              )
            )
          )
        )
      )
    )
  )
)
WHERE namenosign IS NOT NULL;
