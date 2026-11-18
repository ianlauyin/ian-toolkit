use ian_framework_rs::exception;
use ian_framework_rs::exception::Exception;
use ian_framework_rs::http::error_code;

pub(crate) fn check_name(name: &str) -> Result<(), Exception> {
    let ok = !name.is_empty() && name.chars().all(|c| c.is_ascii_alphanumeric() || c == '-');
    if ok {
        Ok(())
    } else {
        Err(exception!(code = error_code::BAD_REQUEST, "Bad name."))
    }
}
