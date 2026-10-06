// Password management belongs to the canonical owner, including self-service UI.
(function(){const original=window.ffhPasswordForm;window.ffhPasswordForm=function(){return typeof user!=='undefined'&&user?.id==='M21954'?original():'<div class="card"><p>Password changes are managed by Ayon. Contact the owner for a new password.</p></div>';};})();
